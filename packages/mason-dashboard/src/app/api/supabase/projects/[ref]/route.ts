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

  // Validate projectRef format to prevent enumeration/misuse
  const refError = validateProjectRef(projectRef);
  if (refError) {
    return badRequest(refError);
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized('Missing or invalid Authorization header');
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
    console.error('Failed to fetch project:', error);
    return serverError('Failed to fetch project from Supabase');
  }
}
