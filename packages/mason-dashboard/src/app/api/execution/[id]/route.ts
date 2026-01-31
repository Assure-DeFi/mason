import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  notFound,
  forbidden,
  serverError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { getExecutionRun } from '@/lib/execution/engine';

// GET /api/execution/[id] - Get execution run status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await params;
    const run = await getExecutionRun(id);

    if (!run) {
      return notFound('Execution run not found');
    }

    // Verify user owns this run
    if (run.user_id !== session.user.id) {
      return forbidden('You do not have access to this execution run');
    }

    return apiSuccess({ run });
  } catch (error) {
    console.error('Error fetching execution run:', error);
    return serverError(
      error instanceof Error ? error.message : 'Failed to fetch execution run',
    );
  }
}
