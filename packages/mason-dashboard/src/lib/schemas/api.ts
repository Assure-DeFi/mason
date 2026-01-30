/**
 * API Request Validation Schemas
 *
 * Zod schemas for validating API request bodies.
 * Use these with validateRequest() helper to ensure type-safe request handling.
 */

import { z } from 'zod';

/**
 * Execution start request schema
 * Used by /api/execution/start
 */
export const executionStartSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID format'),
  itemIds: z
    .array(z.string().uuid('Invalid item ID format'))
    .min(1, 'At least one item required'),
  githubToken: z.string().min(10, 'GitHub token is required'),
});

export type ExecutionStartRequest = z.infer<typeof executionStartSchema>;

/**
 * Analysis request schema
 * Used by /api/v1/analysis
 */
export const analysisRequestSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID format'),
  mode: z.enum(['quick', 'deep', 'full']).optional().default('quick'),
  focusAreas: z.array(z.string()).optional(),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

/**
 * AI key test request schema
 * Used by /api/ai-keys/test
 */
export const aiKeyTestSchema = z.object({
  provider: z.enum(['anthropic', 'openai'], {
    errorMap: () => ({ message: 'Provider must be "anthropic" or "openai"' }),
  }),
  apiKey: z.string().min(10, 'API key is too short'),
});

export type AIKeyTestRequest = z.infer<typeof aiKeyTestSchema>;

/**
 * Backlog restore request schema
 * Used by /api/backlog/restore
 */
export const backlogRestoreSchema = z.object({
  filteredItemId: z.string().uuid('Invalid filtered item ID format'),
});

export type BacklogRestoreRequest = z.infer<typeof backlogRestoreSchema>;

/**
 * Risk analysis request schema
 * Used by /api/backlog/[id]/analyze-risk
 */
export const riskAnalysisSchema = z.object({
  prdContent: z.string().min(1, 'PRD content is required'),
  repoStructure: z
    .object({
      files: z.array(z.string()).optional(),
      directories: z.array(z.string()).optional(),
    })
    .optional(),
});

export type RiskAnalysisRequest = z.infer<typeof riskAnalysisSchema>;

/**
 * Supabase query request schema
 * Used by /api/supabase/projects/[ref]/query
 */
export const supabaseQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
});

export type SupabaseQueryRequest = z.infer<typeof supabaseQuerySchema>;

/**
 * PRD generation request schema
 * Used by /api/prd/[id]
 */
export const prdGenerationSchema = z.object({
  problemStatement: z.string().min(10, 'Problem statement is required'),
  solutionOutline: z.string().min(10, 'Solution outline is required'),
  targetArea: z.string().optional(),
});

export type PRDGenerationRequest = z.infer<typeof prdGenerationSchema>;

/**
 * Account deletion confirmation schema
 * Used by /api/account/delete
 */
export const accountDeleteSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

export type AccountDeleteRequest = z.infer<typeof accountDeleteSchema>;
