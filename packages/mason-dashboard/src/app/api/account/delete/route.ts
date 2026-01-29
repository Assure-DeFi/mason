import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth/auth-options';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * DELETE /api/account/delete - Delete user account from central database
 *
 * This deletes the user from the central Mason database.
 * Cascading deletes handle mason_api_keys and mason_github_repositories.
 *
 * Note: User's own Supabase data must be deleted separately by the client
 * before calling this endpoint, as we don't store their credentials server-side.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Delete user from central database
    // Foreign key constraints with ON DELETE CASCADE will handle:
    // - mason_api_keys
    // - mason_github_repositories
    const { error } = await supabase
      .from('mason_users')
      .delete()
      .eq('id', session.user.id);

    if (error) {
      console.error('Failed to delete user from central DB:', error);
      return NextResponse.json(
        { error: 'Failed to delete account from central database' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
