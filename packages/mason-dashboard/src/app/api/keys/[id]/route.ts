import { getServerSession } from 'next-auth';

import { createAuditLogger } from '@/lib/api/audit';
import {
  apiSuccess,
  unauthorized,
  badRequest,
  forbidden,
  serverError,
} from '@/lib/api-response';
import { deleteApiKey } from '@/lib/auth/api-key';
import { authOptions } from '@/lib/auth/auth-options';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/keys/[id] - Revoke an API key
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await params;

    if (!id) {
      return badRequest('Missing key ID');
    }

    const result = await deleteApiKey(id, session.user.id);

    if (result === 'not_found') {
      return forbidden('API key not found or access denied');
    }

    if (result === 'error') {
      return serverError('Failed to delete API key');
    }

    // Audit log the API key deletion (fire-and-forget)
    try {
      const supabase = createServiceClient();
      const audit = createAuditLogger(supabase, request, session.user.id);
      // Fire and forget to not impact response time
      void audit.apiKeyDeleted(id);
    } catch {
      // Audit logging failure should never break the operation
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return serverError();
  }
}
