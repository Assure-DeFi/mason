/**
 * Audit Logging Service
 *
 * Provides structured audit logging for security-sensitive operations.
 * Logs are stored in the mason_audit_logs table in the central database.
 *
 * IMPORTANT: This runs async/fire-and-forget to avoid impacting API response times.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { TABLES } from '@/lib/constants';

/**
 * Event types for audit logging
 */
export type AuditEventType =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'api_key.created'
  | 'api_key.deleted'
  | 'api_key.used'
  | 'account.deleted'
  | 'account.updated'
  | 'repository.connected'
  | 'repository.disconnected'
  | 'data.export'
  | 'data.delete'
  | 'admin.action';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  user_id?: string;
  event_type: AuditEventType;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  action: string;
  details?: Record<string, unknown>;
  success?: boolean;
  error_message?: string;
}

/**
 * Extract IP address from request headers
 */
export function getClientIp(request: Request): string | undefined {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Log a security-sensitive event to the audit log table
 *
 * This function is fire-and-forget to avoid impacting API response times.
 * Errors are logged to console but don't fail the calling operation.
 *
 * @param supabase - Supabase client instance
 * @param entry - Audit log entry data
 */
export async function auditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: entry.user_id,
      event_type: entry.event_type,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      action: entry.action,
      details: entry.details || {},
      success: entry.success ?? true,
      error_message: entry.error_message,
    });

    if (error) {
      // Log to console but don't fail the operation
      // The audit log table might not exist in older databases
      console.warn('[AUDIT] Failed to write audit log:', error.message);
    }
  } catch (err) {
    // Fail silently - audit logging should never break the main operation
    console.warn(
      '[AUDIT] Error writing audit log:',
      err instanceof Error ? err.message : 'Unknown error',
    );
  }
}

/**
 * Create an audit logger bound to a specific request context
 *
 * @param supabase - Supabase client instance
 * @param request - HTTP request for extracting context
 * @param userId - Authenticated user ID
 */
export function createAuditLogger(
  supabase: SupabaseClient,
  request: Request,
  userId?: string,
) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  return {
    /**
     * Log an audit event with pre-filled request context
     */
    log(
      entry: Omit<AuditLogEntry, 'user_id' | 'ip_address' | 'user_agent'>,
    ): Promise<void> {
      return auditLog(supabase, {
        ...entry,
        user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
      });
    },

    /**
     * Log a successful API key creation
     */
    apiKeyCreated(keyId: string, keyName: string): Promise<void> {
      return this.log({
        event_type: 'api_key.created',
        resource_type: 'api_key',
        resource_id: keyId,
        action: 'Created API key',
        details: { key_name: keyName },
      });
    },

    /**
     * Log an API key deletion
     */
    apiKeyDeleted(keyId: string): Promise<void> {
      return this.log({
        event_type: 'api_key.deleted',
        resource_type: 'api_key',
        resource_id: keyId,
        action: 'Deleted API key',
      });
    },

    /**
     * Log a repository connection
     */
    repositoryConnected(repoId: string, repoName: string): Promise<void> {
      return this.log({
        event_type: 'repository.connected',
        resource_type: 'repository',
        resource_id: repoId,
        action: 'Connected repository',
        details: { repo_name: repoName },
      });
    },

    /**
     * Log a repository disconnection
     */
    repositoryDisconnected(repoId: string, repoName: string): Promise<void> {
      return this.log({
        event_type: 'repository.disconnected',
        resource_type: 'repository',
        resource_id: repoId,
        action: 'Disconnected repository',
        details: { repo_name: repoName },
      });
    },

    /**
     * Log an account deletion
     */
    accountDeleted(): Promise<void> {
      return this.log({
        event_type: 'account.deleted',
        resource_type: 'user',
        resource_id: userId,
        action: 'Deleted account',
      });
    },

    /**
     * Log a failed authentication attempt
     */
    authFailed(reason: string): Promise<void> {
      return this.log({
        event_type: 'auth.login_failed',
        action: 'Authentication failed',
        details: { reason },
        success: false,
        error_message: reason,
      });
    },
  };
}
