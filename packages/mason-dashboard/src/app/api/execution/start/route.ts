import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { executeRemotely } from '@/lib/execution/engine';

// POST /api/execution/start - Start remote execution
// Privacy: GitHub token is passed from client (stored in localStorage, not server)
// Idempotency: Pass X-Idempotency-Key header to prevent duplicate executions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract idempotency key from header (optional - for request deduplication)
    const idempotencyKey = request.headers.get('X-Idempotency-Key');

    const body = await request.json();
    const { repositoryId, itemIds, githubToken } = body;

    if (
      !repositoryId ||
      !itemIds ||
      !Array.isArray(itemIds) ||
      itemIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing repositoryId or itemIds' },
        { status: 400 },
      );
    }

    if (!githubToken) {
      return NextResponse.json(
        { error: 'Missing GitHub token' },
        { status: 400 },
      );
    }

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

    return NextResponse.json({
      runId: result.runId,
      success: result.success,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      error: result.error,
    });
  } catch (error) {
    console.error('Error starting execution:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
