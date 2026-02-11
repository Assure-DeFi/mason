import { withSessionAndSupabase, type RouteParams } from '@/lib/api/middleware';
import { apiSuccess, serverError } from '@/lib/api-response';
import { TABLES } from '@/lib/constants';

/**
 * GET /api/backlog/[id]/risk-analysis
 *
 * Retrieves existing dependency analysis for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const handler = withSessionAndSupabase(async ({ userSupabase }) => {
    const { id } = await params;

    const { data: analysis, error: fetchError } = await userSupabase
      .from(TABLES.DEPENDENCY_ANALYSIS)
      .select('*')
      .eq('item_id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return apiSuccess({ analysis: null });
      }
      console.error('Failed to fetch analysis:', fetchError);
      return serverError('Failed to fetch analysis');
    }

    return apiSuccess({ analysis });
  });

  return handler(request);
}
