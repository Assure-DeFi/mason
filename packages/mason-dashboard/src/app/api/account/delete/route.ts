import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  apiError,
  unauthorized,
  serverError,
  ErrorCodes,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import { accountDeleteSchema, validateRequest } from '@/lib/schemas';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/account/delete - Delete user account from central database
 *
 * Requires explicit confirmation to prevent accidental deletion.
 * Body must contain: { confirmation: "DELETE MY ACCOUNT" }
 *
 * This deletes the user from the central Mason database.
 * Cascading deletes handle mason_api_keys and mason_github_repositories.
 *
 * Note: User's own Supabase data must be deleted separately by the client
 * before calling this endpoint, as we don't store their credentials server-side.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    // Require explicit confirmation to proceed
    const validation = await validateRequest(request, accountDeleteSchema);
    if (!validation.success) {
      return validation.error;
    }

    const supabase = createServiceClient();

    // Log deletion attempt for audit trail
    console.log(
      `Account deletion initiated for user ${session.user.id} at ${new Date().toISOString()}`,
    );

    // Delete user from central database
    // Foreign key constraints with ON DELETE CASCADE will handle:
    // - mason_api_keys
    // - mason_github_repositories
    const { error } = await supabase
      .from(TABLES.USERS)
      .delete()
      .eq('id', session.user.id);

    if (error) {
      console.error('Failed to delete user from central DB:', error);
      return serverError('Failed to delete account from central database');
    }

    console.log(
      `Account deleted successfully for user ${session.user.id} at ${new Date().toISOString()}`,
    );
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return serverError();
  }
}

/**
 * DELETE /api/account/delete - Legacy endpoint (deprecated)
 *
 * Returns 405 Method Not Allowed with instructions to use POST.
 * Kept for backward compatibility guidance.
 */
export async function DELETE() {
  return apiError(
    ErrorCodes.BAD_REQUEST,
    'Account deletion now requires explicit confirmation. Use POST with body: { "confirmation": "DELETE MY ACCOUNT" }',
    405,
  );
}
