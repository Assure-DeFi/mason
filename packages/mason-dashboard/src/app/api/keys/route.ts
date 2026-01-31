import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import {
  parsePaginationParams,
  createPaginationMeta,
  PAGINATION_LIMITS,
} from '@/lib/api/pagination';
import { createApiKey, listApiKeys } from '@/lib/auth/api-key';
import { authOptions } from '@/lib/auth/auth-options';
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitIdentifier,
} from '@/lib/rate-limit/middleware';

/**
 * GET /api/keys - List all API keys for the authenticated user
 * Supports pagination: ?limit=20&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { limit, offset } = parsePaginationParams(
      searchParams,
      PAGINATION_LIMITS.API_KEYS,
      PAGINATION_LIMITS.API_KEYS,
    );

    const allKeys = await listApiKeys(session.user.id);

    // Apply pagination manually since listApiKeys doesn't support it
    const paginatedKeys = allKeys.slice(offset, offset + limit);
    const meta = createPaginationMeta(
      limit,
      offset,
      paginatedKeys.length,
      allKeys.length,
    );

    return NextResponse.json({
      keys: paginatedKeys,
      pagination: meta,
    });
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
 *
 * Rate limited: 5 keys per hour per user (uses 'strict' strategy)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit API key creation to prevent abuse (5 per hour via 'strict' strategy)
    const identifier = getRateLimitIdentifier(
      'api-key-create',
      session.user.id,
    );
    const rateLimit = await checkRateLimit(identifier, 'strict');
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
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
