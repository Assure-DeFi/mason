import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import { apiSuccess, unauthorized, serverError } from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { executeRemotely } from '@/lib/execution/engine';
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitIdentifier,
} from '@/lib/rate-limit/middleware';
import { executionStartSchema, validateRequest } from '@/lib/schemas';

// POST /api/execution/start - Start remote execution
// Privacy: GitHub token is passed from client (stored in localStorage, not server)
// Idempotency: Pass X-Idempotency-Key header to prevent duplicate executions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    // Rate limit: 10 executions per hour per user (AI-heavy operation)
    const rateLimitId = getRateLimitIdentifier('execution', session.user.id);
    const rateLimitResult = await checkRateLimit(rateLimitId, 'aiHeavy');
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Extract idempotency key from header (optional - for request deduplication)
    const idempotencyKey = request.headers.get('X-Idempotency-Key');

    // Validate request body with Zod schema
    const validation = await validateRequest(request, executionStartSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { repositoryId, itemIds, githubToken } = validation.data;

    // Start execution (this runs async but returns immediately with run ID)
    // Token from client's localStorage, not from server-side session
    // Idempotency key prevents duplicate execution on rapid clicks or network retries
    const result = await executeRemotely({
      userId: session.user.id,
      repositoryId,
      itemIds,
      accessToken: githubToken,
      idempotencyKey: idempotencyKey || undefined,
    });

    return apiSuccess({
      runId: result.runId,
      success: result.success,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      error: result.error,
    });
  } catch (error) {
    console.error('Error starting execution:', error);
    return serverError(
      error instanceof Error ? error.message : 'Failed to start execution',
    );
  }
}
