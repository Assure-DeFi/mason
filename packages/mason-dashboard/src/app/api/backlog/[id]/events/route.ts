import { withSessionAndSupabase, type RouteParams } from '@/lib/api/middleware';
import { apiSuccess, badRequest, serverError } from '@/lib/api-response';
import { TABLES } from '@/lib/constants';

type ItemEventType =
  | 'status_changed'
  | 'prd_generated'
  | 'branch_created'
  | 'pr_created'
  | 'note_added';

interface ItemEvent {
  id: string;
  created_at: string;
  item_id: string;
  event_type: ItemEventType;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  notes: string | null;
}

/**
 * GET /api/backlog/[id]/events
 *
 * Retrieves the event history for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const handler = withSessionAndSupabase(async ({ userSupabase }) => {
    const { id } = await params;

    const { data: events, error } = await userSupabase
      .from(TABLES.ITEM_EVENTS)
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch events:', error);
      return serverError('Failed to fetch event history');
    }

    return apiSuccess({ events: events as ItemEvent[] });
  });

  return handler(request);
}

/**
 * POST /api/backlog/[id]/events
 *
 * Records a new event for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const handler = withSessionAndSupabase(async ({ userSupabase }) => {
    const { id } = await params;

    const body = await request.json();
    const { event_type, old_value, new_value, notes, dbUserId } = body;

    const validEventTypes: ItemEventType[] = [
      'status_changed',
      'prd_generated',
      'branch_created',
      'pr_created',
      'note_added',
    ];

    if (!event_type || !validEventTypes.includes(event_type)) {
      return badRequest(
        `event_type is required and must be one of: ${validEventTypes.join(', ')}`,
      );
    }

    const { data: event, error } = await userSupabase
      .from(TABLES.ITEM_EVENTS)
      .insert({
        item_id: id,
        event_type,
        old_value: old_value || null,
        new_value: new_value || null,
        user_id: dbUserId || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create event:', error);
      return serverError('Failed to record event');
    }

    return apiSuccess({ event: event as ItemEvent });
  });

  return handler(request);
}
