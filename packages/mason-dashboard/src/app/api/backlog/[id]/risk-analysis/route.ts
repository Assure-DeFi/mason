import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get user's database credentials from session
    const user = session.user as {
      id: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    if (!user.supabaseUrl || !user.supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Database not configured. Please complete setup.' },
        { status: 400 },
      );
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
