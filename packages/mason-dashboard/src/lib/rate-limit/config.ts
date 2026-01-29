import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting configuration using Upstash Redis
 *
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL: Your Upstash Redis REST URL
 * - UPSTASH_REDIS_REST_TOKEN: Your Upstash Redis REST token
 *
 * If not configured, rate limiting will be disabled (development mode).
 */

// Check if Upstash is configured
const isUpstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

// Create Redis client only if configured
const redis = isUpstashConfigured ? Redis.fromEnv() : null;

/**
 * Rate limit strategies for different endpoint types
 */
export const rateLimitStrategies = {
  // AI-intensive operations (PRD generation, code execution)
  // 10 requests per hour per user
  aiHeavy: isUpstashConfigured
    ? new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        analytics: true,
        prefix: 'ratelimit:ai-heavy',
      })
    : null,

  // Standard API operations
  // 100 requests per minute per user
  standard: isUpstashConfigured
    ? new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: 'ratelimit:standard',
      })
    : null,

  // Public endpoints (API key validation)
  // 100 requests per hour per IP
  publicEndpoint: isUpstashConfigured
    ? new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(100, '1 h'),
        analytics: true,
        prefix: 'ratelimit:public',
      })
    : null,

  // Strict endpoints (setup, migrations)
  // 5 requests per hour per user
  strict: isUpstashConfigured
    ? new Ratelimit({
        redis: redis!,
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        analytics: true,
        prefix: 'ratelimit:strict',
      })
    : null,
};

export type RateLimitStrategy = keyof typeof rateLimitStrategies;

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return isUpstashConfigured;
}
