import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { executeRemotely } from '@/lib/execution/engine';

// POST /api/execution/start - Start remote execution
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repositoryId, itemIds } = body;

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

    // Start execution (this runs async but returns immediately with run ID)
    const result = await executeRemotely({
      userId: session.user.id,
      repositoryId,
      itemIds,
      accessToken: session.user.github_access_token,
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
