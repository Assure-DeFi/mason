import { NextResponse } from 'next/server';

import {
  checkRateLimit,
  createRateLimitResponse,
} from '@/lib/rate-limit/middleware';

/**
 * GET /api/health - Health check endpoint
 *
 * Returns a simple status indicating the service is running.
 * This endpoint is public and does not require authentication.
 */
export async function GET(request: Request) {
  // Apply public endpoint rate limiting to prevent abuse
  const identifier = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimitResult = await checkRateLimit(identifier, 'publicEndpoint');

  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: Date.now(),
    },
    { status: 200 },
  );
}
