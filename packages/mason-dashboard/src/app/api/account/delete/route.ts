import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Failed to delete account from central database' },
        { status: 500 },
      );
    }

    console.log(
      `Account deleted successfully for user ${session.user.id} at ${new Date().toISOString()}`,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/account/delete - Legacy endpoint (deprecated)
 *
 * Returns 405 Method Not Allowed with instructions to use POST.
 * Kept for backward compatibility guidance.
 */
export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message:
        'Account deletion now requires explicit confirmation. Use POST with body: { "confirmation": "DELETE MY ACCOUNT" }',
    },
    { status: 405 },
  );
}
