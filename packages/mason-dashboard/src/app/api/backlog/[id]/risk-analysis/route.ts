import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Helper to get the database user_id from session github_id.
 * SECURITY: Required for user_id filtering to prevent IDOR attacks.
 */
async function getDbUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  githubId: string,
): Promise<string | null> {
  const { data: user } = await supabase
    .from(TABLES.USERS)
    .select('id')
    .eq('github_id', githubId)
    .single();

  return user?.id ?? null;
}

/**
 * Helper to verify item ownership.
 * SECURITY: Prevents IDOR by ensuring user owns the referenced backlog item.
 */
async function verifyItemOwnership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  itemId: string,
  dbUserId: string,
): Promise<boolean> {
  const { data: item } = await supabase
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('id')
    .eq('id', itemId)
    .eq('user_id', dbUserId)
    .single();

  return !!item;
}

/**
 * GET /api/backlog/[id]/risk-analysis
 *
 * Retrieves existing dependency analysis for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 * SECURITY: Verifies item ownership before returning analysis.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.github_id) {
      return unauthorized('Authentication required');
    }

    // Get user's database credentials from headers (client passes from localStorage)
    const supabaseUrl = request.headers.get('x-supabase-url');
    const supabaseAnonKey = request.headers.get('x-supabase-anon-key');

    if (!supabaseUrl || !supabaseAnonKey) {
      return badRequest(
        'Database credentials required. Please complete setup.',
      );
    }

    // Connect to user's database
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // SECURITY: Get DB user_id from session github_id for filtering
    const dbUserId = await getDbUserId(supabase, session.user.github_id);
    if (!dbUserId) {
      return unauthorized('User not found in database');
    }

    // SECURITY: Verify the backlog item belongs to the user
    const isOwner = await verifyItemOwnership(supabase, id, dbUserId);
    if (!isOwner) {
      return notFound('Backlog item not found');
    }

    // Now safe to fetch the analysis
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
      // eslint-disable-next-line no-console
      console.error('Failed to fetch analysis:', fetchError);
      return serverError('Failed to fetch analysis');
    }

    return apiSuccess({ analysis });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Risk analysis fetch error:', err);
    return serverError(err instanceof Error ? err.message : 'Fetch failed');
  }
}
