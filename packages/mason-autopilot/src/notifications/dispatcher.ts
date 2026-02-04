/**
 * Notification Dispatcher
 *
 * Central hub that routes notification events to configured channels.
 * Handles channel lookup, event filtering, delivery, retry logic,
 * and delivery logging.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  sendSlackNotification,
  sendEmailNotification,
  sendWebhookNotification,
} from './adapters';
import type {
  NotificationEvent,
  NotificationDeliveryResult,
  AnyChannelConfig,
} from './types';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Notification dispatcher that routes events to configured channels.
 */
export class NotificationDispatcher {
  private supabase: SupabaseClient;
  private verbose: boolean;

  constructor(supabase: SupabaseClient, verbose = false) {
    this.supabase = supabase;
    this.verbose = verbose;
  }

  /**
   * Dispatch a notification event to all matching channels.
   *
   * 1. Queries notification_channels table for matching configs
   * 2. Filters by event type
   * 3. Sends to each channel via appropriate adapter
   * 4. Handles retries for transient failures
   * 5. Logs delivery results
   */
  async dispatch(event: NotificationEvent): Promise<NotificationDeliveryResult[]> {
    const channels = await this.getChannelsForEvent(event);

    if (channels.length === 0) {
      if (this.verbose) {
        console.log(`  [notify] No channels configured for ${event.type}`);
      }
      return [];
    }

    if (this.verbose) {
      console.log(
        `  [notify] Dispatching ${event.type} to ${channels.length} channel(s)`,
      );
    }

    const results: NotificationDeliveryResult[] = [];

    for (const channel of channels) {
      const result = await this.deliverWithRetry(channel, event);
      results.push(result);

      // Log delivery result to database
      await this.logDelivery(channel, event, result);
    }

    // Summary
    const successes = results.filter((r) => r.success).length;
    const failures = results.length - successes;
    if (this.verbose || failures > 0) {
      console.log(
        `  [notify] Delivered: ${successes}/${results.length} (${failures} failed)`,
      );
    }

    return results;
  }

  /**
   * Query notification channels that match this event.
   */
  private async getChannelsForEvent(
    event: NotificationEvent,
  ): Promise<AnyChannelConfig[]> {
    // Query channels for this user that are either:
    // - Scoped to this specific repository
    // - Scoped to all repositories (repository_id is null)
    const { data, error } = await this.supabase
      .from('mason_notification_channels')
      .select('*')
      .eq('user_id', event.userId)
      .eq('enabled', true)
      .or(`repository_id.eq.${event.repositoryId},repository_id.is.null`);

    if (error) {
      console.error('  [notify] Failed to fetch channels:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter by event type
    return (data as AnyChannelConfig[]).filter((channel) => {
      // Empty eventFilter means "all events"
      if (!channel.eventFilter || channel.eventFilter.length === 0) {
        return true;
      }
      return channel.eventFilter.includes(event.type);
    });
  }

  /**
   * Deliver a notification with retry logic for transient failures.
   */
  private async deliverWithRetry(
    channel: AnyChannelConfig,
    event: NotificationEvent,
  ): Promise<NotificationDeliveryResult> {
    let lastResult: NotificationDeliveryResult | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Wait before retry with exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (this.verbose) {
          console.log(
            `  [notify] Retry ${attempt}/${MAX_RETRIES} for ${channel.channelType} channel`,
          );
        }
      }

      const result = await this.deliverToChannel(channel, event);
      lastResult = result;

      if (result.success || !result.retryable) {
        return result;
      }
    }

    return lastResult!;
  }

  /**
   * Route delivery to the appropriate adapter based on channel type.
   */
  private async deliverToChannel(
    channel: AnyChannelConfig,
    event: NotificationEvent,
  ): Promise<NotificationDeliveryResult> {
    switch (channel.channelType) {
      case 'slack':
        return sendSlackNotification(channel, event);
      case 'email':
        return sendEmailNotification(channel, event);
      case 'webhook':
        return sendWebhookNotification(channel, event);
    }
  }

  /**
   * Log a delivery result to the database for audit/debugging.
   */
  private async logDelivery(
    channel: AnyChannelConfig,
    event: NotificationEvent,
    result: NotificationDeliveryResult,
  ): Promise<void> {
    try {
      await this.supabase.from('mason_notification_logs').insert({
        channel_id: channel.id,
        event_type: event.type,
        repository_id: event.repositoryId,
        success: result.success,
        error_message: result.error?.slice(0, 1000),
        status_code: result.statusCode,
        delivered_at: new Date().toISOString(),
      });
    } catch {
      // Silently fail - don't let logging failures affect notifications
    }
  }
}
