import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

import { createApiLogger } from '@/lib/api/logger';
import { isValidSupabaseUrl } from '@/lib/api/middleware';
import {
  apiSuccess,
  unauthorized,
  badRequest,
  serverError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/backlog/[id]/risk-analysis
 *
 * Retrieves existing dependency analysis for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const logger = createApiLogger('backlog.riskAnalysis');
  try {
    const { id } = await params;

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized('Authentication required');
    }
    logger.setUserId(session.user.id);

    // Get user's database credentials from headers (client passes from localStorage)
    const supabaseUrl = request.headers.get('x-supabase-url');
    const supabaseAnonKey = request.headers.get('x-supabase-anon-key');

    if (!supabaseUrl || !supabaseAnonKey) {
      return badRequest(
        'Database credentials required. Please complete setup.',
      );
    }

    if (!isValidSupabaseUrl(supabaseUrl)) {
      return badRequest('Invalid Supabase URL');
    }

    // Connect to user's database
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch the analysis
    const { data: analysis, error: fetchError } = await supabase
      .from(TABLES.DEPENDENCY_ANALYSIS)
      .select('*')
      .eq('item_id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No analysis found
        return apiSuccess({ analysis: null });
      }
      logger.error('Failed to fetch analysis', {
        error:
          fetchError instanceof Error ? fetchError.message : String(fetchError),
      });
      return serverError('Failed to fetch analysis');
    }

    return apiSuccess({ analysis });
  } catch (err) {
    logger.error('Risk analysis fetch error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return serverError(err instanceof Error ? err.message : 'Fetch failed');
  }
}
