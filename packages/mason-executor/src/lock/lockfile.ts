import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

/**
 * Lockfile content structure
 */
export interface LockfileContent {
  pid: number;
  command: string;
  startedAt: string;
  hostname: string;
}

/**
 * Result of acquiring a lock
 */
export interface LockResult {
  acquired: boolean;
  existingLock?: LockfileContent;
  isStale?: boolean;
}

/**
 * Check if a process is still running
 */
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the lockfile path
 */
export function getLockfilePath(repoPath: string, dataDir = '.mason'): string {
  return join(repoPath, dataDir, 'mason.lock');
}

/**
 * Read the lockfile
 */
export function readLockfile(lockPath: string): LockfileContent | null {
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const content = readFileSync(lockPath, 'utf-8');
    return JSON.parse(content) as LockfileContent;
  } catch {
    return null;
  }
}

/**
 * Write the lockfile
 */
function writeLockfile(lockPath: string, content: LockfileContent): void {
  writeFileSync(lockPath, JSON.stringify(content, null, 2), { mode: 0o644 });
}

/**
 * Remove the lockfile
 */
export function removeLockfile(lockPath: string): void {
  if (existsSync(lockPath)) {
    unlinkSync(lockPath);
  }
}

/**
 * Try to acquire the lock
 */
export function acquireLock(
  repoPath: string,
  command: string,
  dataDir = '.mason',
): LockResult {
  const lockPath = getLockfilePath(repoPath, dataDir);
  const existingLock = readLockfile(lockPath);

  if (existingLock) {
    // Check if the process is still running
    const isRunning = isProcessRunning(existingLock.pid);
    const isSameHost = existingLock.hostname === hostname();

    if (isRunning && isSameHost) {
      // Lock is held by a running process on this machine
      return {
        acquired: false,
        existingLock,
        isStale: false,
      };
    }

    // Lock is stale - process is dead or on different host
    // Remove stale lock and proceed
    removeLockfile(lockPath);
    return acquireLockInternal(lockPath, command);
  }

  return acquireLockInternal(lockPath, command);
}

/**
 * Internal function to write the lock
 */
function acquireLockInternal(lockPath: string, command: string): LockResult {
  const content: LockfileContent = {
    pid: process.pid,
    command,
    startedAt: new Date().toISOString(),
    hostname: hostname(),
  };

  writeLockfile(lockPath, content);

  return { acquired: true };
}

/**
 * Release the lock
 */
export function releaseLock(repoPath: string, dataDir = '.mason'): void {
  const lockPath = getLockfilePath(repoPath, dataDir);
  removeLockfile(lockPath);
}

/**
 * Set up automatic lock release on process exit
 */
export function setupAutoRelease(repoPath: string, dataDir = '.mason'): void {
  const lockPath = getLockfilePath(repoPath, dataDir);

  const cleanup = () => {
    try {
      removeLockfile(lockPath);
    } catch {
      // Ignore errors during cleanup
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    cleanup();
    process.exit(1);
  });
}

/**
 * Format lock info for display
 */
export function formatLockInfo(lock: LockfileContent): string {
  const startedAt = new Date(lock.startedAt);
  const elapsed = Date.now() - startedAt.getTime();
  const minutes = Math.floor(elapsed / 60000);

  return `PID ${lock.pid}, command: ${lock.command}, started ${minutes} minute(s) ago`;
}
