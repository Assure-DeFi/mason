import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generatePrd } from '@/lib/prd/generate-prd';
import type { BacklogItem } from '@/types/backlog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch the item
    const { data: item, error: fetchError } = await supabase
      .from('mason_pm_backlog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      console.error('Supabase error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch item' },
        { status: 500 },
      );
    }

    // Generate PRD
    const prdContent = await generatePrd({ item: item as BacklogItem });

    // Update the item with PRD content
    const { data: updated, error: updateError } = await supabase
      .from('mason_pm_backlog_items')
      .update({
        prd_content: prdContent,
        prd_generated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save PRD' },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PRD generation error:', err);

    // Check for specific error types
    if (err instanceof Error) {
      if (err.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          { error: 'Anthropic API key not configured' },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate PRD' },
      { status: 500 },
    );
  }
}
