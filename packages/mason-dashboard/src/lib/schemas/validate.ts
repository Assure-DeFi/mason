/**
 * Request Validation Helper
 *
 * Provides type-safe request body validation using Zod schemas.
 * Returns standardized error responses for invalid payloads.
 */

import { NextResponse } from 'next/server';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse };

/**
 * Formats Zod validation errors into a user-friendly message
 */
function formatZodErrors(error: ZodError): string {
  return error.errors
    .map((err) => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    })
    .join('; ');
}

/**
 * Validates a request body against a Zod schema
 *
 * @param request - The Next.js request object
 * @param schema - The Zod schema to validate against
 * @returns Validation result with typed data or error response
 *
 * @example
 * ```ts
 * const result = await validateRequest(request, mySchema);
 * if (!result.success) {
 *   return result.error;
 * }
 * const { data } = result;
 * // data is now typed according to the schema
 * ```
 */
export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: formatZodErrors(result.error),
          },
          { status: 400 },
        ),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      ),
    };
  }
}

/**
 * Validates a plain object against a Zod schema (for non-request contexts)
 *
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Validation result with typed data or error details
 */
export function validateData<T>(
  data: unknown,
  schema: ZodSchema<T>,
): { success: true; data: T } | { success: false; errors: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: formatZodErrors(result.error),
    };
  }

  return { success: true, data: result.data };
}
