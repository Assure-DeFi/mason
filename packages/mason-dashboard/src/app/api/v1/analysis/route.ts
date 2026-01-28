import { NextResponse } from 'next/server';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';

/**
 * POST /api/v1/analysis/validate - Validate API key and return user info
 * Authorization: Bearer mason_xxxxx
 *
 * PRIVACY ARCHITECTURE:
 * - This endpoint ONLY validates the API key
 * - It does NOT receive or store any analysis data
 * - The CLI writes data directly to the user's Supabase using their credentials
 * - Central server never sees the user's backlog items
 */
export async function POST(request: Request) {
  try {
    // Extract and validate API key
    const authHeader = request.headers.get('Authorization');
    const apiKey = extractApiKeyFromHeader(authHeader);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 },
      );
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Construct dashboard URL
    const dashboardUrl =
      process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://mason.assuredefi.com';

    // Return validation success with user info
    // The CLI will use this to confirm identity before writing to their own Supabase
    return NextResponse.json({
      valid: true,
      user_id: user.id,
      github_username: user.github_username,
      dashboard_url: `${dashboardUrl}/admin/backlog`,
    });
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
