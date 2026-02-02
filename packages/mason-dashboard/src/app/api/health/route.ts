import { NextResponse } from 'next/server';

/**
 * GET /api/health - Health check endpoint
 *
 * Returns a simple status indicating the service is running.
 * This endpoint is public and does not require authentication.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: Date.now(),
    },
    { status: 200 },
  );
}
