export type { LockfileContent, LockResult } from './lockfile.js';
export {
  getLockfilePath,
  readLockfile,
  removeLockfile,
  acquireLock,
  releaseLock,
  setupAutoRelease,
  formatLockInfo,
} from './lockfile.js';
