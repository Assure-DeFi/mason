/**
 * Notification System
 *
 * External notification channels for autopilot events.
 * Supports Slack webhooks, email, and generic HTTP webhooks.
 */

export { NotificationDispatcher } from './dispatcher';
export type {
  NotificationEvent,
  NotificationEventType,
  NotificationEventData,
  NotificationChannelType,
  NotificationChannelConfig,
  SlackChannelConfig,
  EmailChannelConfig,
  WebhookChannelConfig,
  AnyChannelConfig,
  NotificationDeliveryResult,
  AnalysisCompletedData,
  HighPriorityFindingData,
  ExecutionCompletedData,
  ExecutionFailedData,
  DailyDigestData,
} from './types';
