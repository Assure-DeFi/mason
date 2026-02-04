import { apiSuccess } from '@/lib/api-response';

/**
 * GET /api/health - Health check endpoint
 *
 * Returns a simple status indicating the service is running.
 * This endpoint is public and does not require authentication.
 *
 * @returns Standardized API response with health status
 */
export async function GET() {
  return apiSuccess({
    status: 'ok',
    timestamp: Date.now(),
    version: process.env.npm_package_version ?? '0.1.0',
  });
}
