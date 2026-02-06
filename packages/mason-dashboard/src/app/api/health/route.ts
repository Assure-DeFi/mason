import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/client';

/**
 * DLQ metrics shape returned by the get_dlq_metrics() RPC function.
 */
interface DlqMetrics {
  total_count: number;
  last_24h_count: number;
  last_hour_count: number;
  oldest_entry: string | null;
  newest_entry: string | null;
  max_consecutive_failures: number;
  error_types: Array<{ type: string; count: number }>;
}

/**
 * Determine DLQ health status based on total error count.
 */
function getDlqStatus(totalCount: number): 'healthy' | 'warning' | 'critical' {
  if (totalCount > 50) {
    return 'critical';
  }
  if (totalCount >= 10) {
    return 'warning';
  }
  return 'healthy';
}

/**
 * GET /api/health - Health check endpoint
 *
 * Returns service status and DLQ metrics when available.
 * This endpoint is public and does not require authentication.
 *
 * DLQ metrics are fetched from the get_dlq_metrics() RPC function.
 * If the function is not available (migration not yet run), dlq is returned as null.
 */
export async function GET() {
  let dlq: {
    status: 'healthy' | 'warning' | 'critical';
    total_count: number;
    last_24h_count: number;
    last_hour_count: number;
    oldest_entry: string | null;
    max_consecutive_failures: number;
    error_types: Array<{ type: string; count: number }>;
  } | null = null;

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('get_dlq_metrics');

    if (!error && data) {
      const metrics = data as DlqMetrics;
      dlq = {
        status: getDlqStatus(metrics.total_count),
        total_count: metrics.total_count,
        last_24h_count: metrics.last_24h_count,
        last_hour_count: metrics.last_hour_count,
        oldest_entry: metrics.oldest_entry,
        max_consecutive_failures: metrics.max_consecutive_failures,
        error_types: metrics.error_types,
      };
    }
  } catch {
    // Supabase not configured or RPC not available - dlq stays null
  }

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: Date.now(),
      dlq,
    },
    { status: 200 },
  );
}
