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
 * GET /api/backlog/[id]/prd
 *
 * Fetches the PRD content for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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

    // Fetch the PRD content
    const { data, error: fetchError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('prd_content')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch PRD:', fetchError);
      return serverError('Failed to fetch PRD content');
    }

    return apiSuccess({ prd_content: data?.prd_content ?? null });
  } catch (err) {
    console.error('PRD fetch error:', err);
    return serverError(err instanceof Error ? err.message : 'Fetch failed');
  }
}

/**
 * PATCH /api/backlog/[id]/prd
 *
 * Updates the PRD content for a backlog item.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
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

    // Update the PRD content
    const { data, error: updateError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update({
        prd_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update PRD:', updateError);
      return serverError('Failed to update PRD content');
    }

    return apiSuccess({ item: data });
  } catch (err) {
    console.error('PRD update error:', err);
    return serverError(err instanceof Error ? err.message : 'Update failed');
  }
}
