import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

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
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized('Authentication required');
    }

    // Get user's database credentials from session
    const user = session.user as {
      id: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    if (!user.supabaseUrl || !user.supabaseAnonKey) {
      return badRequest('Database not configured. Please complete setup.');
    }

    // Connect to user's database
    const supabase = createClient(user.supabaseUrl, user.supabaseAnonKey);

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
      console.error('Failed to fetch analysis:', fetchError);
      return serverError('Failed to fetch analysis');
    }

    return apiSuccess({ analysis });
  } catch (err) {
    console.error('Risk analysis fetch error:', err);
    return serverError(err instanceof Error ? err.message : 'Fetch failed');
  }
}
