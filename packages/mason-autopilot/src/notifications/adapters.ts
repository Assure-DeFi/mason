/**
 * Notification Channel Adapters
 *
 * Implements delivery logic for each notification channel type:
 * - Slack: Sends rich Block Kit messages via incoming webhook
 * - Email: Sends formatted HTML emails (placeholder - requires SendGrid/SES)
 * - Webhook: Sends JSON payloads with optional HMAC signature
 */

import { createHmac } from 'node:crypto';

import type {
  NotificationEvent,
  NotificationDeliveryResult,
  SlackChannelConfig,
  EmailChannelConfig,
  WebhookChannelConfig,
} from './types';

// ============================================================================
// Slack Adapter
// ============================================================================

/**
 * Format a notification event into a Slack Block Kit message.
 */
function formatSlackMessage(event: NotificationEvent): object {
  const repoName = event.repositoryName || 'Unknown repo';
  const timestamp = new Date(event.timestamp).toLocaleString();

  switch (event.type) {
    case 'analysis_completed': {
      const data = event.data as { itemsFound: number; itemsApproved: number };
      return {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `Mason Analysis Complete`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Repository:*\n${repoName}` },
              { type: 'mrkdwn', text: `*Items Found:*\n${data.itemsFound}` },
              { type: 'mrkdwn', text: `*Auto-Approved:*\n${data.itemsApproved}` },
              { type: 'mrkdwn', text: `*Time:*\n${timestamp}` },
            ],
          },
        ],
      };
    }

    case 'high_priority_finding': {
      const data = event.data as { title: string; impactScore: number; type: string };
      return {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `High-Priority Finding`, emoji: true },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${data.title}*\nImpact: ${data.impactScore}/10 | Type: ${data.type} | Repo: ${repoName}`,
            },
          },
        ],
      };
    }

    case 'execution_completed': {
      const data = event.data as { itemsExecuted: number; prsCreated: number };
      return {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `Mason Execution Complete`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Repository:*\n${repoName}` },
              { type: 'mrkdwn', text: `*Items Executed:*\n${data.itemsExecuted}` },
              { type: 'mrkdwn', text: `*PRs Created:*\n${data.prsCreated}` },
              { type: 'mrkdwn', text: `*Time:*\n${timestamp}` },
            ],
          },
        ],
      };
    }

    case 'execution_failed': {
      const data = event.data as { error: string; itemTitle?: string; consecutiveFailures: number };
      return {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `Execution Failed`, emoji: true },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Repository:* ${repoName}\n*Error:* ${data.error.slice(0, 200)}${data.itemTitle ? `\n*Item:* ${data.itemTitle}` : ''}\n*Consecutive Failures:* ${data.consecutiveFailures}`,
            },
          },
        ],
      };
    }

    case 'daily_digest': {
      const data = event.data as {
        itemsAnalyzed: number;
        itemsExecuted: number;
        itemsApproved: number;
        prsCreated: number;
        errors: number;
      };
      return {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `Mason Daily Digest`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Repository:*\n${repoName}` },
              { type: 'mrkdwn', text: `*Analyzed:*\n${data.itemsAnalyzed}` },
              { type: 'mrkdwn', text: `*Approved:*\n${data.itemsApproved}` },
              { type: 'mrkdwn', text: `*Executed:*\n${data.itemsExecuted}` },
              { type: 'mrkdwn', text: `*PRs Created:*\n${data.prsCreated}` },
              { type: 'mrkdwn', text: `*Errors:*\n${data.errors}` },
            ],
          },
        ],
      };
    }

    default:
      return {
        text: `Mason notification: ${event.type} for ${repoName}`,
      };
  }
}

/**
 * Send notification via Slack incoming webhook.
 */
export async function sendSlackNotification(
  channel: SlackChannelConfig,
  event: NotificationEvent,
): Promise<NotificationDeliveryResult> {
  try {
    const message = formatSlackMessage(event);

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        channelId: channel.id,
        channelType: 'slack',
        success: false,
        error: `Slack webhook returned ${response.status}: ${body}`,
        statusCode: response.status,
        retryable: response.status >= 500,
      };
    }

    return {
      channelId: channel.id,
      channelType: 'slack',
      success: true,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      channelId: channel.id,
      channelType: 'slack',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
  }
}

// ============================================================================
// Email Adapter (Placeholder)
// ============================================================================

/**
 * Send notification via email.
 *
 * NOTE: This is a placeholder implementation. In production, integrate with
 * SendGrid, AWS SES, or another email service. For now, it logs the email
 * that would be sent.
 */
export async function sendEmailNotification(
  channel: EmailChannelConfig,
  event: NotificationEvent,
): Promise<NotificationDeliveryResult> {
  // Placeholder: log what would be sent
  const repoName = event.repositoryName || 'Unknown';
  const subject = `Mason: ${event.type.replace(/_/g, ' ')} - ${repoName}`;

  console.log(`  [email] Would send to ${channel.config.email}:`);
  console.log(`    Subject: ${subject}`);
  console.log(`    Event: ${event.type}`);

  // Return success since we logged it (in production, wire up actual email)
  return {
    channelId: channel.id,
    channelType: 'email',
    success: true,
  };
}

// ============================================================================
// Webhook Adapter
// ============================================================================

/**
 * Compute HMAC-SHA256 signature for webhook payload verification.
 */
function computeHmacSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Send notification via generic HTTP webhook.
 * Includes HMAC signature header if secret is configured.
 */
export async function sendWebhookNotification(
  channel: WebhookChannelConfig,
  event: NotificationEvent,
): Promise<NotificationDeliveryResult> {
  try {
    const payload = JSON.stringify({
      event: event.type,
      timestamp: event.timestamp,
      repository_id: event.repositoryId,
      repository_name: event.repositoryName,
      data: event.data,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mason-Autopilot/1.0',
      ...channel.config.headers,
    };

    // Add HMAC signature if secret is configured
    if (channel.config.secret) {
      headers['X-Mason-Signature'] = computeHmacSignature(
        payload,
        channel.config.secret,
      );
    }

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers,
      body: payload,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '(no body)');
      return {
        channelId: channel.id,
        channelType: 'webhook',
        success: false,
        error: `Webhook returned ${response.status}: ${body.slice(0, 200)}`,
        statusCode: response.status,
        retryable: response.status >= 500,
      };
    }

    return {
      channelId: channel.id,
      channelType: 'webhook',
      success: true,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      channelId: channel.id,
      channelType: 'webhook',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
  }
}
