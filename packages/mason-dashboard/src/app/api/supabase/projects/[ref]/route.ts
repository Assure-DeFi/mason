import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

const MANAGEMENT_API_BASE = 'https://api.supabase.com/v1';

interface RouteParams {
  params: Promise<{ ref: string }>;
}

/**
 * GET /api/supabase/projects/[ref]
 *
 * Proxies the Supabase Management API to avoid CORS issues.
 * Gets a specific project by reference.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { ref: projectRef } = await params;
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(
      `${MANAGEMENT_API_BASE}/projects/${projectRef}`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      },
    );

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
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project from Supabase' },
      { status: 500 },
    );
  }
}
