import AnthropicClient from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAIClient from 'openai';

import { authOptions } from '@/lib/auth/auth-options';

export async function POST(request: Request) {
  try {
    // Require authentication before allowing API key testing
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 },
      );
    }

    if (provider === 'anthropic') {
      // Test Anthropic connection with a minimal request
      const client = new AnthropicClient({ apiKey });

      try {
        await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        });

        return NextResponse.json({ success: true, provider: 'anthropic' });
      } catch (err) {
        const error = err as Error & { status?: number };
        if (error.status === 401) {
          return NextResponse.json(
            { error: 'Invalid Anthropic API key' },
            { status: 401 },
          );
        }
        throw err;
      }
    } else if (provider === 'openai') {
      // Test OpenAI connection with a minimal request
      const client = new OpenAIClient({ apiKey });

      try {
        await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        });

        return NextResponse.json({ success: true, provider: 'openai' });
      } catch (err) {
        const error = err as Error & { status?: number };
        if (error.status === 401) {
          return NextResponse.json(
            { error: 'Invalid OpenAI API key' },
            { status: 401 },
          );
        }
        throw err;
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "anthropic" or "openai"' },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error('AI key test error:', err);
    return NextResponse.json(
      { error: 'Connection test failed. Please check your API key.' },
      { status: 500 },
    );
  }
}
