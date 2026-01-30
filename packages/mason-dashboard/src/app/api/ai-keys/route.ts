import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import {
  formatDatabaseError,
  getUserFriendlyDatabaseError,
} from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from(TABLES.AI_PROVIDER_KEYS)
      .select('id, provider, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(formatDatabaseError('fetch AI keys', error));
      return NextResponse.json(
        { error: getUserFriendlyDatabaseError('fetch AI keys', error) },
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
    // Require authentication and use session user ID (not request body)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const body = await request.json();

    const { provider, apiKey } = body;
    // Note: userId from body is intentionally ignored - we use session.user.id

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
          user_id: session.user.id, // Use authenticated session, not body
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
      console.error(formatDatabaseError('save AI key', error));
      return NextResponse.json(
        { error: getUserFriendlyDatabaseError('save AI key', error) },
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
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      .eq('provider', provider)
      .eq('user_id', session.user.id); // Only delete user's own keys

    if (error) {
      console.error(formatDatabaseError('delete AI key', error));
      return NextResponse.json(
        { error: getUserFriendlyDatabaseError('delete AI key', error) },
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
