import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

import {
  apiSuccess,
  unauthorized,
  badRequest,
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
 * GET /api/backlog/[id]/events
 *
 * Retrieves the event history for a backlog item.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized('Authentication required');
    }

    const user = session.user as {
      id: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };

    if (!user.supabaseUrl || !user.supabaseAnonKey) {
      return badRequest('Database not configured. Please complete setup.');
    }

    const supabase = createClient(user.supabaseUrl, user.supabaseAnonKey);

    const { data: events, error } = await supabase
      .from(TABLES.ITEM_EVENTS)
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch events:', error);
      return serverError('Failed to fetch event history');
    }

    return apiSuccess({ events: events as ItemEvent[] });
  } catch (err) {
    console.error('Events fetch error:', err);
    return serverError(err instanceof Error ? err.message : 'Fetch failed');
  }
}

/**
 * POST /api/backlog/[id]/events
 *
 * Records a new event for a backlog item.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized('Authentication required');
    }

    const user = session.user as {
      id: string;
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      dbUserId?: string;
    };

    if (!user.supabaseUrl || !user.supabaseAnonKey) {
      return badRequest('Database not configured. Please complete setup.');
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

    const supabase = createClient(user.supabaseUrl, user.supabaseAnonKey);

    const { data: event, error } = await supabase
      .from(TABLES.ITEM_EVENTS)
      .insert({
        item_id: id,
        event_type,
        old_value: old_value || null,
        new_value: new_value || null,
        user_id: user.dbUserId || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create event:', error);
      return serverError('Failed to record event');
    }

    return apiSuccess({ event: event as ItemEvent });
  } catch (err) {
    console.error('Event creation error:', err);
    return serverError(err instanceof Error ? err.message : 'Creation failed');
  }
}
