/**
 * Structured API Logger
 *
 * Provides consistent, structured logging for API routes.
 * Each log entry includes:
 * - requestId: Unique identifier for request correlation
 * - userId: Authenticated user (when available)
 * - operation: Name of the API operation
 * - duration: Request processing time
 */

import { randomUUID } from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Unique request identifier for correlation */
  requestId: string;
  /** Authenticated user ID (if available) */
  userId?: string;
  /** Name of the API operation */
  operation: string;
  /** Request processing duration in milliseconds */
  duration?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
}

/**
 * Creates a new logger instance for an API request.
 *
 * @param operation - Name of the API operation (e.g., 'execution.start')
 * @returns Logger instance with context methods
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const logger = createApiLogger('execution.start');
 *   logger.setUserId(session.user.id);
 *
 *   logger.info('Starting execution', { itemCount: 5 });
 *
 *   try {
 *     const result = await doSomething();
 *     logger.success('Execution completed', { runId: result.id });
 *     return apiSuccess(result);
 *   } catch (error) {
 *     logger.error('Execution failed', { error: error.message });
 *     return serverError();
 *   }
 * }
 * ```
 */
export function createApiLogger(operation: string) {
  const requestId = randomUUID();
  const startTime = Date.now();
  let userId: string | undefined;
  let metadata: Record<string, unknown> = {};

  const formatEntry = (
    level: LogLevel,
    message: string,
    extra?: Record<string, unknown>,
  ): LogEntry => ({
    timestamp: new Date().toISOString(),
    level,
    requestId,
    userId,
    operation,
    duration: Date.now() - startTime,
    message,
    metadata: { ...metadata, ...extra },
  });

  const log = (
    level: LogLevel,
    message: string,
    extra?: Record<string, unknown>,
  ) => {
    const entry = formatEntry(level, message, extra);

    // Format for console output
    const prefix = `[${entry.level.toUpperCase()}] [${operation}]`;
    const contextStr = `reqId=${requestId}${userId ? ` userId=${userId}` : ''}`;
    const durationStr = entry.duration ? ` (${entry.duration}ms)` : '';

    switch (level) {
      case 'debug':
        console.debug(
          `${prefix} ${message} | ${contextStr}${durationStr}`,
          extra ?? '',
        );
        break;
      case 'info':
        console.log(
          `${prefix} ${message} | ${contextStr}${durationStr}`,
          extra ?? '',
        );
        break;
      case 'warn':
        console.warn(
          `${prefix} ${message} | ${contextStr}${durationStr}`,
          extra ?? '',
        );
        break;
      case 'error':
        console.error(
          `${prefix} ${message} | ${contextStr}${durationStr}`,
          extra ?? '',
        );
        break;
    }
  };

  return {
    /** Get the unique request ID */
    requestId,

    /** Set the authenticated user ID */
    setUserId(id: string) {
      userId = id;
    },

    /** Add metadata that will be included in all subsequent logs */
    addMetadata(data: Record<string, unknown>) {
      metadata = { ...metadata, ...data };
    },

    /** Log a debug message */
    debug(message: string, extra?: Record<string, unknown>) {
      log('debug', message, extra);
    },

    /** Log an info message */
    info(message: string, extra?: Record<string, unknown>) {
      log('info', message, extra);
    },

    /** Log a warning message */
    warn(message: string, extra?: Record<string, unknown>) {
      log('warn', message, extra);
    },

    /** Log an error message */
    error(message: string, extra?: Record<string, unknown>) {
      log('error', message, extra);
    },

    /** Log a successful operation completion */
    success(message: string, extra?: Record<string, unknown>) {
      log('info', `✓ ${message}`, extra);
    },

    /** Get the current request duration in milliseconds */
    getDuration(): number {
      return Date.now() - startTime;
    },

    /** Get the full log context for external use */
    getContext(): LogContext {
      return {
        requestId,
        userId,
        operation,
        duration: Date.now() - startTime,
        metadata,
      };
    },
  };
}

/**
 * Type for the logger returned by createApiLogger
 */
export type ApiLogger = ReturnType<typeof createApiLogger>;
