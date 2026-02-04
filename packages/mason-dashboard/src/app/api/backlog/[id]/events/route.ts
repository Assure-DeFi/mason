import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api-response';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * Helper to get the database user_id from session github_id.
 * SECURITY: Required for user_id filtering to prevent IDOR attacks.
 */
async function getDbUserId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  githubId: string,
): Promise<string | null> {
  const { data: user } = await supabase
    .from(TABLES.USERS)
    .select('id')
    .eq('github_id', githubId)
    .single();

  return user?.id ?? null;
}

/**
 * Helper to verify item ownership before accessing events.
 * SECURITY: Prevents IDOR by ensuring user owns the referenced backlog item.
 */
async function verifyItemOwnership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  itemId: string,
  dbUserId: string,
): Promise<boolean> {
  const { data: item } = await supabase
    .from(TABLES.PM_BACKLOG_ITEMS)
    .select('id')
    .eq('id', itemId)
    .eq('user_id', dbUserId)
    .single();

  return !!item;
}

/**
 * GET /api/backlog/[id]/events
 *
 * Retrieves the event history for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 * SECURITY: Verifies item ownership before returning events.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.github_id) {
      return unauthorized('Authentication required');
    }

    // Get user's database credentials from headers (client passes from localStorage)
    const supabaseUrl = request.headers.get('x-supabase-url');
    const supabaseAnonKey = request.headers.get('x-supabase-anon-key');

    if (!supabaseUrl || !supabaseAnonKey) {
      return badRequest(
        'Database credentials required. Please complete setup.',
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // SECURITY: Get DB user_id from session github_id for filtering
    const dbUserId = await getDbUserId(supabase, session.user.github_id);
    if (!dbUserId) {
      return unauthorized('User not found in database');
    }

    // SECURITY: Verify the backlog item belongs to the user
    const isOwner = await verifyItemOwnership(supabase, id, dbUserId);
    if (!isOwner) {
      return notFound('Backlog item not found');
    }

    // Now safe to fetch events for this item
    const { data: events, error } = await supabase
      .from(TABLES.ITEM_EVENTS)
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch events:', error);
      return serverError('Failed to fetch event history');
    }

    return apiSuccess({ events: events as ItemEvent[] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Events fetch error:', err);
    return serverError(err instanceof Error ? err.message : 'Fetch failed');
  }
}

/**
 * POST /api/backlog/[id]/events
 *
 * Records a new event for a backlog item.
 * Requires user's Supabase credentials via headers (privacy model).
 * SECURITY: Verifies item ownership before creating event.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.github_id) {
      return unauthorized('Authentication required');
    }

    // Get user's database credentials from headers (client passes from localStorage)
    const supabaseUrl = request.headers.get('x-supabase-url');
    const supabaseAnonKey = request.headers.get('x-supabase-anon-key');

    if (!supabaseUrl || !supabaseAnonKey) {
      return badRequest(
        'Database credentials required. Please complete setup.',
      );
    }

    const body = await request.json();
    const { event_type, old_value, new_value, notes } = body;

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // SECURITY: Get DB user_id from session github_id for filtering
    const dbUserId = await getDbUserId(supabase, session.user.github_id);
    if (!dbUserId) {
      return unauthorized('User not found in database');
    }

    // SECURITY: Verify the backlog item belongs to the user
    const isOwner = await verifyItemOwnership(supabase, id, dbUserId);
    if (!isOwner) {
      return notFound('Backlog item not found');
    }

    // Now safe to create event for this item
    const { data: event, error } = await supabase
      .from(TABLES.ITEM_EVENTS)
      .insert({
        item_id: id,
        event_type,
        old_value: old_value || null,
        new_value: new_value || null,
        user_id: dbUserId, // Use the verified DB user_id, not arbitrary input
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create event:', error);
      return serverError('Failed to record event');
    }

    return apiSuccess({ event: event as ItemEvent });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Event creation error:', err);
    return serverError(err instanceof Error ? err.message : 'Creation failed');
  }
}
