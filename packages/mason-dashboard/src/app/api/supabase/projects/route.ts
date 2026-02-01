import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  apiError,
  unauthorized,
  serverError,
  ErrorCodes,
} from '@/lib/api-response';

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
    return unauthorized('Missing or invalid Authorization header');
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
      return apiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        errorData.message ||
          errorData.error ||
          `Supabase API error: ${response.status}`,
        response.status,
      );
    }

    const data = await response.json();
    // Return raw data for backward compatibility (this endpoint returns the Supabase API response directly)
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return apiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Request timed out. The Supabase API is taking too long to respond.',
        504,
      );
    }
    console.error('Failed to fetch projects:', error);
    return serverError('Failed to fetch projects from Supabase');
  }
}
