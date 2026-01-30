import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MANAGEMENT_API_BASE = 'https://api.supabase.com/v1';

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET /api/supabase/projects
 *
 * Proxies the Supabase Management API to avoid CORS issues.
 * Lists all projects the authenticated user has access to.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 },
    );
  }

  try {
    const response = await fetchWithTimeout(`${MANAGEMENT_API_BASE}/projects`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errorData.message ||
            errorData.error ||
            `Supabase API error: ${response.status}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error:
            'Request timed out. The Supabase API is taking too long to respond.',
        },
        { status: 504 },
      );
    }
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects from Supabase' },
      { status: 500 },
    );
  }
}
