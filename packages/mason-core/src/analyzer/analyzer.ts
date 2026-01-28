import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  DomainConfig,
  ReviewDomainResult,
  ReviewImprovement,
} from '../types/index.js';
import { getFilteredFiles, estimateTokens } from '../files/filter.js';
import { getLogger } from '../logging/logger.js';
import {
  ANALYSIS_SYSTEM_PROMPT,
  getDomainPrompt,
  IMPROVEMENT_FORMAT,
} from './prompts.js';

const logger = getLogger();

/**
 * Analyzer configuration
 */
export interface AnalyzerConfig {
  /** Path to the repository */
  repoPath: string;

  /** Anthropic API key */
  apiKey: string;

  /** Maximum tokens per domain */
  maxTokensPerDomain: number;

  /** Maximum files per domain */
  maxFilesPerDomain: number;

  /** Maximum file size in bytes */
  maxFileSize: number;

  /** Additional ignore patterns */
  ignorePatterns?: string[];

  /** Model to use */
  model?: string;
}

/**
 * Parse improvements from LLM response
 */
function parseImprovements(response: string): ReviewImprovement[] {
  try {
    // Try to extract JSON from response
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match?.[1]) {
        jsonStr = match[1].trim();
      }
    }

    const parsed = JSON.parse(jsonStr) as {
      improvements: Array<{
        title: string;
        problem: string;
        solution: string;
        impactScore: number;
        effortScore: number;
        complexity: string;
        affectedFiles?: string[];
        reasoning?: string;
      }>;
    };

    return parsed.improvements.map((imp) => ({
      title: imp.title,
      problem: imp.problem,
      solution: imp.solution,
      impactScore: Math.min(10, Math.max(1, Math.round(imp.impactScore))),
      effortScore: Math.min(10, Math.max(1, Math.round(imp.effortScore))),
      complexity: (['low', 'medium', 'high', 'very_high'].includes(
        imp.complexity,
      )
        ? imp.complexity
        : 'medium') as 'low' | 'medium' | 'high' | 'very_high',
      affectedFiles: imp.affectedFiles ?? [],
      reasoning: imp.reasoning,
    }));
  } catch (err) {
    logger.warn('Failed to parse improvements from response', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Analyze a single domain
 */
export async function analyzeDomain(
  config: AnalyzerConfig,
  domain: DomainConfig,
): Promise<ReviewDomainResult> {
  const log = logger.child(domain.name);
  log.verbose(`Starting analysis`);

  // Get files to analyze
  const { files, skipped } = await getFilteredFiles({
    basePath: config.repoPath,
    additionalIgnore: config.ignorePatterns,
    maxFileSize: config.maxFileSize,
    priorityOnly: false,
  });

  log.verbose(`Found ${files.length} files, ${skipped.length} skipped`);

  // Limit files per domain
  const domainFiles = files.slice(0, config.maxFilesPerDomain);

  // Read file contents with token budget
  let totalTokens = 0;
  const fileContents: string[] = [];
  const analyzedFiles: string[] = [];
  const skippedForTokens: Array<{ path: string; reason: string }> = [];

  for (const file of domainFiles) {
    const fullPath = join(config.repoPath, file);
    try {
      const content = readFileSync(fullPath, 'utf-8');
      const tokens = estimateTokens(content);

      if (totalTokens + tokens > config.maxTokensPerDomain) {
        skippedForTokens.push({
          path: file,
          reason: `Token budget exceeded (${totalTokens + tokens} > ${config.maxTokensPerDomain})`,
        });
        continue;
      }

      totalTokens += tokens;
      fileContents.push(`// File: ${file}\n${content}\n`);
      analyzedFiles.push(file);
    } catch (err) {
      skippedForTokens.push({
        path: file,
        reason: err instanceof Error ? err.message : 'Could not read file',
      });
    }
  }

  log.verbose(
    `Analyzing ${analyzedFiles.length} files (${totalTokens} estimated tokens)`,
  );

  // Build the prompt
  const domainPrompt = getDomainPrompt(domain.name);
  const customContext = domain.promptContext
    ? `\n\nAdditional context:\n${domain.promptContext}`
    : '';

  const userPrompt = `${domainPrompt}${customContext}

${IMPROVEMENT_FORMAT}

Here is the code to analyze:

${fileContents.join('\n---\n')}`;

  // Call Claude API
  const client = new Anthropic({ apiKey: config.apiKey });

  try {
    const response = await client.messages.create({
      model: config.model ?? 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const responseText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    const tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);

    log.verbose(`Analysis complete, ${tokensUsed} tokens used`);

    const improvements = parseImprovements(responseText);
    log.info(`Found ${improvements.length} improvements`);

    return {
      domain: domain.name,
      improvements,
      tokensUsed,
      filesAnalyzed: analyzedFiles,
      filesSkipped: [...skipped, ...skippedForTokens],
    };
  } catch (err) {
    log.error('Analysis failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return {
      domain: domain.name,
      improvements: [],
      tokensUsed: 0,
      filesAnalyzed: analyzedFiles,
      filesSkipped: [...skipped, ...skippedForTokens],
    };
  }
}

/**
 * Run full analysis across all domains
 */
export async function analyzeRepository(
  config: AnalyzerConfig,
  domains: DomainConfig[],
  onProgress?: (domain: string, current: number, total: number) => void,
): Promise<ReviewDomainResult[]> {
  const enabledDomains = domains.filter((d) => d.enabled);
  const results: ReviewDomainResult[] = [];

  for (let i = 0; i < enabledDomains.length; i++) {
    const domain = enabledDomains[i]!;
    onProgress?.(domain.name, i + 1, enabledDomains.length);

    const result = await analyzeDomain(config, domain);
    results.push(result);
  }

  return results;
}

/**
 * Estimate cost for analyzing a repository
 */
export function estimateAnalysisCost(
  tokensEstimate: number,
  model = 'claude-sonnet-4-20250514',
): { inputCost: number; outputCost: number; totalCost: number } {
  // Approximate pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-opus-4-20250514': { input: 15, output: 75 },
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  };

  const rates = pricing[model] ?? pricing['claude-sonnet-4-20250514']!;

  // Assume 80% input, 20% output
  const inputTokens = tokensEstimate * 0.8;
  const outputTokens = tokensEstimate * 0.2;

  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
