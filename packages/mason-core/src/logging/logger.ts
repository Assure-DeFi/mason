import {
  existsSync,
  mkdirSync,
  appendFileSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'verbose' | 'info' | 'warn' | 'error';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum level to output to console */
  consoleLevel: LogLevel;

  /** Whether to write to log file */
  fileLogging: boolean;

  /** Directory for log files */
  logDir: string;

  /** Maximum number of log files to keep */
  maxLogFiles: number;

  /** Maximum log file size in bytes */
  maxLogSize: number;

  /** Whether to include timestamps in console output */
  showTimestamps: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  consoleLevel: 'info',
  fileLogging: true,
  logDir: join(homedir(), '.mason', 'logs'),
  maxLogFiles: 10,
  maxLogSize: 10 * 1024 * 1024, // 10MB
  showTimestamps: false,
};

/**
 * Level priorities (lower = more verbose)
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  verbose: 1,
  info: 2,
  warn: 3,
  error: 4,
};

/**
 * Level prefixes for console output
 */
const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: '[DEBUG]',
  verbose: '[VERBOSE]',
  info: '',
  warn: '[WARN]',
  error: '[ERROR]',
};

/**
 * Format a timestamp for logs
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format a log entry for file
 */
function formatFileEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): string {
  const timestamp = formatTimestamp();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${level.toUpperCase().padEnd(7)} ${message}${contextStr}\n`;
}

/**
 * Mason logger
 */
export class Logger {
  private config: LoggerConfig;
  private logFile: string | null = null;
  private logFileSize = 0;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeLogFile();
  }

  /**
   * Initialize log file
   */
  private initializeLogFile(): void {
    if (!this.config.fileLogging) {
      return;
    }

    // Ensure log directory exists
    if (!existsSync(this.config.logDir)) {
      mkdirSync(this.config.logDir, { recursive: true });
    }

    // Clean up old log files
    this.rotateLogFiles();

    // Create new log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = join(this.config.logDir, `mason-${timestamp}.log`);
    this.logFileSize = 0;
  }

  /**
   * Rotate log files (delete old ones)
   */
  private rotateLogFiles(): void {
    if (!existsSync(this.config.logDir)) {
      return;
    }

    const files = readdirSync(this.config.logDir)
      .filter((f) => f.startsWith('mason-') && f.endsWith('.log'))
      .map((f) => ({
        name: f,
        path: join(this.config.logDir, f),
        mtime: statSync(join(this.config.logDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Delete files beyond max
    const toDelete = files.slice(this.config.maxLogFiles - 1);
    for (const file of toDelete) {
      try {
        unlinkSync(file.path);
      } catch {
        // Ignore errors when deleting old logs
      }
    }
  }

  /**
   * Write to log file
   */
  private writeToFile(entry: string): void {
    if (!this.logFile) {
      return;
    }

    try {
      appendFileSync(this.logFile, entry);
      this.logFileSize += entry.length;

      // Rotate if file is too large
      if (this.logFileSize >= this.config.maxLogSize) {
        this.initializeLogFile();
      }
    } catch {
      // Ignore file write errors
    }
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.consoleLevel];
  }

  /**
   * Log a message
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    // Always write to file
    if (this.config.fileLogging) {
      this.writeToFile(formatFileEntry(level, message, context));
    }

    // Check if should output to console
    if (!this.shouldLog(level)) {
      return;
    }

    // Format console output
    let output = message;

    if (LEVEL_PREFIX[level]) {
      output = `${LEVEL_PREFIX[level]} ${output}`;
    }

    if (this.config.showTimestamps) {
      output = `[${formatTimestamp()}] ${output}`;
    }

    // Output to appropriate stream
    if (level === 'error') {
      console.error(output);
      if (context) {
        console.error(context);
      }
    } else if (level === 'warn') {
      console.warn(output);
      if (context) {
        console.warn(context);
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(output);
      if (context && (level === 'debug' || level === 'verbose')) {
        // eslint-disable-next-line no-console
        console.log(context);
      }
    }
  }

  /**
   * Log debug message (only in debug mode)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log verbose message (in verbose or debug mode)
   */
  verbose(message: string, context?: Record<string, unknown>): void {
    this.log('verbose', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  /**
   * Update log level
   */
  setLevel(level: LogLevel): void {
    this.config.consoleLevel = level;
  }

  /**
   * Get current log file path
   */
  getLogFile(): string | null {
    return this.logFile;
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): ChildLogger {
    return new ChildLogger(this, prefix);
  }
}

/**
 * Child logger with prefix
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private prefix: string,
  ) {}

  private format(message: string): string {
    return `[${this.prefix}] ${message}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(this.format(message), context);
  }

  verbose(message: string, context?: Record<string, unknown>): void {
    this.parent.verbose(this.format(message), context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(this.format(message), context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(this.format(message), context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.parent.error(this.format(message), context);
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Get or create global logger
 */
export function getLogger(config?: Partial<LoggerConfig>): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  } else if (config) {
    // Update config if provided
    if (config.consoleLevel !== undefined) {
      globalLogger.setLevel(config.consoleLevel);
    }
  }
  return globalLogger;
}

/**
 * Create a new logger with specific config
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

/**
 * Convert verbosity flags to log level
 */
export function verbosityToLevel(verbose: boolean, debug: boolean): LogLevel {
  if (debug) {
    return 'debug';
  }
  if (verbose) {
    return 'verbose';
  }
  return 'info';
}
