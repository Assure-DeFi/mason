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
 * GET /api/backlog/[id]/prd
 *
 * Fetches the PRD content for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 * SECURITY: Always filters by user_id to prevent IDOR attacks.
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

    // SECURITY: Fetch PRD content with user_id filter to prevent IDOR
    const { data, error: fetchError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('prd_content')
      .eq('id', id)
      .eq('user_id', dbUserId)
      .single();

    if (fetchError || !data) {
      // Item not found or doesn't belong to user - return 404 (don't leak existence)
      return notFound('Backlog item not found');
    }

    return apiSuccess({ prd_content: data?.prd_content ?? null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('PRD fetch error:', err);
    return serverError(err instanceof Error ? err.message : 'Fetch failed');
  }
}

/**
 * PATCH /api/backlog/[id]/prd
 *
 * Updates the PRD content for a backlog item.
 * SECURITY: Always filters by user_id to prevent IDOR attacks.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
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

    // Parse request body
    const body = await request.json();
    const { prd_content } = body;

    if (typeof prd_content !== 'string') {
      return badRequest('prd_content is required and must be a string');
    }

    // Connect to user's database
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // SECURITY: Get DB user_id from session github_id for filtering
    const dbUserId = await getDbUserId(supabase, session.user.github_id);
    if (!dbUserId) {
      return unauthorized('User not found in database');
    }

    // SECURITY: Update PRD content with user_id filter to prevent IDOR
    const { data, error: updateError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update({
        prd_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', dbUserId)
      .select()
      .single();

    if (updateError || !data) {
      // Item not found or doesn't belong to user - return 404
      return notFound('Backlog item not found');
    }

    return apiSuccess({ item: data });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('PRD update error:', err);
    return serverError(err instanceof Error ? err.message : 'Update failed');
  }
}
