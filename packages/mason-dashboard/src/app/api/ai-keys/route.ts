import { NextResponse } from 'next/server';

import { TABLES } from '@/lib/constants';
import { createServerClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from(TABLES.AI_PROVIDER_KEYS)
      .select('id, provider, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AI keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI keys' },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('AI keys GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { provider, apiKey, userId } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 },
      );
    }

    if (!['anthropic', 'openai'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "anthropic" or "openai"' },
        { status: 400 },
      );
    }

    // Validate key format
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-api03-')) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key format' },
        { status: 400 },
      );
    }

    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key format' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from(TABLES.AI_PROVIDER_KEYS)
      .upsert(
        {
          user_id: userId,
          provider,
          api_key: apiKey,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,provider',
        },
      )
      .select('id, provider, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error saving AI key:', error);
      return NextResponse.json(
        { error: 'Failed to save AI key' },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('AI keys POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from(TABLES.AI_PROVIDER_KEYS)
      .delete()
      .eq('provider', provider);

    if (error) {
      console.error('Error deleting AI key:', error);
      return NextResponse.json(
        { error: 'Failed to delete AI key' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('AI keys DELETE error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
