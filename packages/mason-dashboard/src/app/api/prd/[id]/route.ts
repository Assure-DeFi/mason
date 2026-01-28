import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generatePrd, type AIProvider } from '@/lib/prd/generate-prd';
import { TABLES } from '@/lib/constants';
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

    // Try to fetch AI provider key from user's database
    // Prefer Anthropic, fall back to OpenAI
    const { data: aiKeys } = await supabase
      .from(TABLES.AI_PROVIDER_KEYS)
      .select('provider, api_key')
      .in('provider', ['anthropic', 'openai'])
      .order('provider', { ascending: true }); // anthropic comes before openai alphabetically

    let provider: AIProvider = 'anthropic';
    let apiKey: string | undefined;

    if (aiKeys && aiKeys.length > 0) {
      // Prefer Anthropic if available
      const anthropicKey = aiKeys.find((k) => k.provider === 'anthropic');
      const openaiKey = aiKeys.find((k) => k.provider === 'openai');

      if (anthropicKey) {
        provider = 'anthropic';
        apiKey = anthropicKey.api_key;
      } else if (openaiKey) {
        provider = 'openai';
        apiKey = openaiKey.api_key;
      }
    }

    // Generate PRD with provider and key
    const prdContent = await generatePrd({
      item: item as BacklogItem,
      provider,
      apiKey,
    });

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
      // Check for AI key not configured error
      if (err.message.includes('AI_KEY_NOT_CONFIGURED')) {
        return NextResponse.json(
          {
            error: 'AI_KEY_NOT_CONFIGURED',
            message:
              'No AI provider key configured. Please configure your AI provider in Settings > AI Providers.',
          },
          { status: 503 },
        );
      }

      // Check for authentication errors from providers
      if (
        err.message.includes('401') ||
        err.message.includes('authentication') ||
        err.message.includes('invalid_api_key')
      ) {
        return NextResponse.json(
          {
            error: 'AI_KEY_INVALID',
            message:
              'AI provider key is invalid. Please check your key in Settings > AI Providers.',
          },
          { status: 401 },
        );
      }

      // Legacy check for environment variable error
      if (err.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          {
            error: 'AI_KEY_NOT_CONFIGURED',
            message:
              'No AI provider key configured. Please configure your AI provider in Settings > AI Providers.',
          },
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
