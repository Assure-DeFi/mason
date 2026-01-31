import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
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

    // Parse request body
    const body = await request.json();
    const { prd_content } = body;

    if (typeof prd_content !== 'string') {
      return NextResponse.json(
        { error: 'prd_content is required and must be a string' },
        { status: 400 },
      );
    }

    // Connect to user's database
    const supabase = createClient(user.supabaseUrl, user.supabaseAnonKey);

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
      return NextResponse.json(
        { error: 'Failed to update PRD content' },
        { status: 500 },
      );
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('PRD update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
