import { withSessionAndSupabase, type RouteParams } from '@/lib/api/middleware';
import { apiSuccess, badRequest, serverError } from '@/lib/api-response';
import { TABLES } from '@/lib/constants';

/**
 * GET /api/backlog/[id]/prd
 *
 * Fetches the PRD content for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const handler = withSessionAndSupabase(async ({ userSupabase }) => {
    const { id } = await params;

    const { data, error: fetchError } = await userSupabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('prd_content')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Failed to fetch PRD:', fetchError);
      return serverError('Failed to fetch PRD content');
    }

    return apiSuccess({ prd_content: data?.prd_content ?? null });
  });

  return handler(request);
}

/**
 * PATCH /api/backlog/[id]/prd
 *
 * Updates the PRD content for a backlog item.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const handler = withSessionAndSupabase(async ({ userSupabase }) => {
    const { id } = await params;

    const body = await request.json();
    const { prd_content } = body;

    if (typeof prd_content !== 'string') {
      return badRequest('prd_content is required and must be a string');
    }

    const { data, error: updateError } = await userSupabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update({
        prd_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update PRD:', updateError);
      return serverError('Failed to update PRD content');
    }

    return apiSuccess({ item: data });
  });

  return handler(request);
}
