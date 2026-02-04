/**
 * Notification System Types
 *
 * Defines the event types, channel configurations, and interfaces
 * for the external notification system.
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * All autopilot events that can trigger notifications.
 */
export type NotificationEventType =
  | 'analysis_completed'
  | 'high_priority_finding'
  | 'execution_completed'
  | 'execution_failed'
  | 'daily_digest';

/**
 * The payload for a notification event.
 */
export interface NotificationEvent {
  type: NotificationEventType;
  repositoryId: string;
  repositoryName?: string;
  userId: string;
  timestamp: string;
  data: NotificationEventData;
}

/**
 * Event-specific payload data.
 */
export type NotificationEventData =
  | AnalysisCompletedData
  | HighPriorityFindingData
  | ExecutionCompletedData
  | ExecutionFailedData
  | DailyDigestData;

export interface AnalysisCompletedData {
  runId: string;
  itemsFound: number;
  itemsApproved: number;
}

export interface HighPriorityFindingData {
  itemId: string;
  title: string;
  impactScore: number;
  type: string;
}

export interface ExecutionCompletedData {
  runId: string;
  itemsExecuted: number;
  prsCreated: number;
  branch?: string;
}

export interface ExecutionFailedData {
  runId: string;
  error: string;
  itemTitle?: string;
  consecutiveFailures: number;
}

export interface DailyDigestData {
  itemsAnalyzed: number;
  itemsExecuted: number;
  itemsApproved: number;
  prsCreated: number;
  errors: number;
}

// ============================================================================
// Channel Types
// ============================================================================

/**
 * Supported notification channel types.
 */
export type NotificationChannelType = 'slack' | 'email' | 'webhook';

/**
 * Base configuration for a notification channel.
 */
export interface NotificationChannelConfig {
  id: string;
  userId: string;
  repositoryId: string | null; // null = all repos
  channelType: NotificationChannelType;
  enabled: boolean;
  /** Which events this channel listens to. Empty = all events. */
  eventFilter: NotificationEventType[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Slack-specific channel configuration.
 */
export interface SlackChannelConfig extends NotificationChannelConfig {
  channelType: 'slack';
  config: {
    webhookUrl: string;
    channelName?: string;
  };
}

/**
 * Email-specific channel configuration.
 */
export interface EmailChannelConfig extends NotificationChannelConfig {
  channelType: 'email';
  config: {
    email: string;
    /** 'instant' sends per-event, 'daily' batches into digest */
    frequency: 'instant' | 'daily';
  };
}

/**
 * Generic webhook channel configuration.
 */
export interface WebhookChannelConfig extends NotificationChannelConfig {
  channelType: 'webhook';
  config: {
    url: string;
    /** Optional secret for HMAC signature verification */
    secret?: string;
    /** Custom headers to include */
    headers?: Record<string, string>;
  };
}

export type AnyChannelConfig =
  | SlackChannelConfig
  | EmailChannelConfig
  | WebhookChannelConfig;

// ============================================================================
// Delivery Results
// ============================================================================

export interface NotificationDeliveryResult {
  channelId: string;
  channelType: NotificationChannelType;
  success: boolean;
  error?: string;
  statusCode?: number;
  retryable?: boolean;
}
