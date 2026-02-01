import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  apiError,
  unauthorized,
  badRequest,
  serverError,
  ErrorCodes,
} from '@/lib/api-response';
import { validateProjectRef } from '@/lib/validation/supabase';

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

interface RouteParams {
  params: Promise<{ ref: string }>;
}

/**
 * GET /api/supabase/projects/[ref]/api-keys
 *
 * Proxies the Supabase Management API to avoid CORS issues.
 * Gets API keys for a specific project.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { ref: projectRef } = await params;
  const authHeader = request.headers.get('Authorization');

  // Validate projectRef format to prevent enumeration/misuse
  const refError = validateProjectRef(projectRef);
  if (refError) {
    return badRequest(refError);
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized('Missing or invalid Authorization header');
  }

  try {
    const response = await fetchWithTimeout(
      `${MANAGEMENT_API_BASE}/projects/${projectRef}/api-keys`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      },
    );

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
    // Return raw data for backward compatibility
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return apiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Request timed out. The Supabase API is taking too long to respond.',
        504,
      );
    }
    console.error('Failed to fetch API keys:', error);
    return serverError('Failed to fetch API keys from Supabase');
  }
}
