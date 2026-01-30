import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get a Supabase client connected to the user's database.
 */
async function getUserDatabaseClient(githubId: string) {
  const centralClient = createServiceClient();

  const { data: user, error } = await centralClient
    .from('mason_users')
    .select('supabase_url, supabase_anon_key')
    .eq('github_id', githubId)
    .single();

  if (error || !user?.supabase_url || !user?.supabase_anon_key) {
    return null;
  }

  return createClient(user.supabase_url, user.supabase_anon_key);
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
    if (!session?.user?.github_id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Connect to user's database
    const supabase = await getUserDatabaseClient(session.user.github_id);
    if (!supabase) {
      return NextResponse.json(
        { error: 'User database not configured. Please complete setup.' },
        { status: 400 },
      );
    }

    // Fetch the analysis
    const { data: analysis, error: fetchError } = await supabase
      .from(TABLES.DEPENDENCY_ANALYSIS)
      .select('*')
      .eq('item_id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No analysis found
        return NextResponse.json({ analysis: null });
      }
      console.error('Failed to fetch analysis:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch analysis' },
        { status: 500 },
      );
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('Risk analysis fetch error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fetch failed' },
      { status: 500 },
    );
  }
}
