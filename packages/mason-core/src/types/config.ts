import { z } from 'zod';

/**
 * Stack type detected or configured
 */
export type StackType = 'nextjs' | 'react' | 'node' | 'unknown';

/**
 * Cost and token limits configuration
 */
export const LimitsConfigSchema = z.object({
  /** Maximum tokens per review operation */
  maxTokensPerReview: z.number().int().positive().default(100000),

  /** Maximum cost per review in USD */
  maxCostPerReview: z.number().positive().default(5.0),

  /** Maximum files to analyze per domain */
  maxFilesPerAnalysis: z.number().int().positive().default(500),

  /** Cost threshold to warn user */
  warnAtCost: z.number().positive().default(1.0),

  /** Maximum file size to analyze in bytes */
  maxFileSize: z.number().int().positive().default(102400), // 100KB

  /** Maximum concurrent items in execution */
  maxConcurrentItems: z.number().int().positive().default(5),
});

export type LimitsConfig = z.infer<typeof LimitsConfigSchema>;

/**
 * Validation commands configuration
 */
export const ValidationConfigSchema = z.object({
  /** TypeScript type check command */
  typecheck: z.string().optional(),

  /** Linting command */
  lint: z.string().optional(),

  /** Test command */
  test: z.string().optional(),

  /** Build command */
  build: z.string().optional(),
});

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;

/**
 * Domain configuration for analysis
 */
export const DomainConfigSchema = z.object({
  /** Domain name */
  name: z.string(),

  /** Whether this domain is enabled */
  enabled: z.boolean().default(true),

  /** Domain-specific prompt context to append */
  promptContext: z.string().optional(),

  /** Weight multiplier for priority scoring (default: 1.0) */
  weight: z.number().positive().default(1.0),
});

export type DomainConfig = z.infer<typeof DomainConfigSchema>;

/**
 * Main Mason configuration schema
 */
export const MasonConfigSchema = z.object({
  /** Schema version for migration support */
  $schema: z.string().optional(),

  /** Config version */
  version: z.literal(1).default(1),

  /** Detected or configured stack type */
  stack: z.enum(['nextjs', 'react', 'node', 'unknown']).default('unknown'),

  /** API key (not recommended - use env var) */
  apiKey: z.string().optional(),

  /** Path to Mason data directory (default: .mason in repo root) */
  dataDir: z.string().default('.mason'),

  /** Cost and token limits */
  limits: LimitsConfigSchema.default({}),

  /** Validation commands */
  validation: ValidationConfigSchema.default({}),

  /** Domain configurations */
  domains: z.array(DomainConfigSchema).default([]),

  /** Additional ignore patterns */
  ignore: z.array(z.string()).default([]),

  /** Include patterns (override ignores - use carefully) */
  include: z.array(z.string()).default([]),

  /** Cache TTL in hours */
  cacheTtlHours: z.number().int().positive().default(24),
});

export type MasonConfig = z.infer<typeof MasonConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: MasonConfig = MasonConfigSchema.parse({});

/**
 * Default domains for analysis
 */
export const DEFAULT_DOMAINS: DomainConfig[] = [
  {
    name: 'frontend-ux',
    enabled: true,
    weight: 1.0,
  },
  {
    name: 'api-backend',
    enabled: true,
    weight: 1.0,
  },
  {
    name: 'reliability',
    enabled: true,
    weight: 1.0,
  },
  {
    name: 'security',
    enabled: true,
    weight: 1.2, // Slightly higher weight for security
  },
  {
    name: 'code-quality',
    enabled: true,
    weight: 0.8, // Slightly lower weight for polish
  },
];
