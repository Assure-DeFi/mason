import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { deleteApiKey } from '@/lib/auth/api-key';
import { authOptions } from '@/lib/auth/auth-options';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/keys/[id] - Revoke an API key
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
    }

    const success = await deleteApiKey(id, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
