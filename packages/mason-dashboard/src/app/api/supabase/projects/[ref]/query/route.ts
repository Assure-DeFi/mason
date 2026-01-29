import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

const MANAGEMENT_API_BASE = 'https://api.supabase.com/v1';

interface RouteParams {
  params: Promise<{ ref: string }>;
}

interface QueryRequestBody {
  query: string;
  read_only?: boolean;
}

/**
 * POST /api/supabase/projects/[ref]/query
 *
 * Proxies the Supabase Management API to avoid CORS issues.
 * Runs a SQL query against a project's database.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { ref: projectRef } = await params;
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 },
    );
  }

  let body: QueryRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  if (!body.query) {
    return NextResponse.json(
      { error: 'Missing query in request body' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `${MANAGEMENT_API_BASE}/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: body.query,
          read_only: body.read_only ?? false,
        }),
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
    console.error('Failed to run query:', error);
    return NextResponse.json(
      { error: 'Failed to run query on Supabase' },
      { status: 500 },
    );
  }
}
