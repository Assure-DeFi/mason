/**
 * OpenAPI Specification Endpoint
 *
 * GET /api/docs/openapi.json
 *
 * Returns the OpenAPI 3.1 specification for the Mason API.
 * This endpoint is used by Swagger UI and other API documentation tools.
 */

import { NextResponse } from 'next/server';

import { generateOpenAPIDocument } from '@/lib/openapi/registry';

export async function GET(): Promise<NextResponse> {
  const document = generateOpenAPIDocument();

  return NextResponse.json(document, {
    headers: {
      // Allow cross-origin access for Swagger UI hosted elsewhere
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      // Cache for 5 minutes in production
      'Cache-Control': 'public, max-age=300',
    },
  });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
