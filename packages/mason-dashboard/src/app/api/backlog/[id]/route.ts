import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import type { BacklogStatus } from '@/types/backlog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('mason_pm_backlog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch item' },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Validate status if provided
    const validStatuses: BacklogStatus[] = [
      'new',
      'approved',
      'in_progress',
      'completed',
      'rejected',
    ];

    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.status) {
      updates.status = body.status;
    }

    if (body.prd_content !== undefined) {
      updates.prd_content = body.prd_content;
      updates.prd_generated_at = new Date().toISOString();
    }

    if (body.branch_name !== undefined) {
      updates.branch_name = body.branch_name;
    }

    if (body.pr_url !== undefined) {
      updates.pr_url = body.pr_url;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('mason_pm_backlog_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
