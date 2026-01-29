import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { createApiKey, listApiKeys } from '@/lib/auth/api-key';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * GET /api/keys - List all API keys for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await listApiKeys(session.user.id);

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Failed to list API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/keys - Generate a new API key
 * Body: { name?: string }
 * Response: { key: string, info: ApiKeyInfo }
 * Note: The full key is only returned once - store it immediately
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = body.name || 'Default';

    const result = await createApiKey(session.user.id, name);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      key: result.key,
      info: result.info,
    });
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
