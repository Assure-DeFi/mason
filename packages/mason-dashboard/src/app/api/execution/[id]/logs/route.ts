import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  notFound,
  forbidden,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { getExecutionRun, getExecutionLogs } from '@/lib/execution/engine';

// GET /api/execution/[id]/logs - Stream execution logs via SSE
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return unauthorized();
  }

  const { id } = await params;
  const run = await getExecutionRun(id);

  if (!run) {
    return notFound('Execution run not found');
  }

  if (run.user_id !== session.user.id) {
    return forbidden('You do not have access to this execution run');
  }

  // Check if client wants SSE
  const acceptHeader = request.headers.get('Accept');
  const isSSE = acceptHeader?.includes('text/event-stream');

  if (!isSSE) {
    // Return all logs as JSON
    const logs = await getExecutionLogs(id);
    return apiSuccess({ logs });
  }

  // SSE streaming
  const encoder = new TextEncoder();
  const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minute timeout
  const POLL_INTERVAL_MS = 1000;
  const MAX_CONSECUTIVE_ERRORS = 5;

  const stream = new ReadableStream({
    async start(controller) {
      let lastTimestamp: string | undefined;
      let isRunning = true;
      let consecutiveErrors = 0;
      const startTime = Date.now();

      const sendError = (message: string) => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message })}\n\n`,
            ),
          );
        } catch {
          // Controller may already be closed
        }
      };

      const sendLogs = async (): Promise<boolean> => {
        try {
          const logs = await getExecutionLogs(id, lastTimestamp);

          for (const log of logs) {
            const data = JSON.stringify(log);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            lastTimestamp = log.created_at;
          }

          // Check if run is still in progress
          const currentRun = await getExecutionRun(id);
          if (!currentRun) {
            sendError('Execution run not found');
            return false;
          }

          if (
            currentRun.status === 'success' ||
            currentRun.status === 'failed' ||
            currentRun.status === 'cancelled'
          ) {
            // Send final status with item results for partial success tracking
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'complete',
                  status: currentRun.status,
                  pr_url: currentRun.pr_url,
                  item_results: currentRun.item_results,
                  success_count: currentRun.success_count,
                  failure_count: currentRun.failure_count,
                })}\n\n`,
              ),
            );
            return false;
          }

          // Reset error counter on success
          consecutiveErrors = 0;
          return true;
        } catch (error) {
          consecutiveErrors++;
          console.error(
            `SSE log fetch error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
            error,
          );

          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            sendError('Too many consecutive errors fetching logs');
            return false;
          }

          // Continue polling despite transient errors
          return true;
        }
      };

      try {
        // Send initial logs
        isRunning = await sendLogs();

        // Poll for new logs with timeout protection
        while (isRunning) {
          // Check timeout
          if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
            sendError('Execution monitoring timed out');
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          isRunning = await sendLogs();
        }
      } catch (error) {
        console.error('SSE stream error:', error);
        sendError('Stream error occurred');
      } finally {
        try {
          controller.close();
        } catch {
          // Controller may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
