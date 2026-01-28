export const VERSION = '0.1.0';

// Git operations
export type { GitState, GitStateIssue } from './git/index.js';
export {
  isGitRepo,
  getCurrentBranch,
  getHeadCommit,
  hasUncommittedChanges,
  hasUntrackedFiles,
  isDetachedHead,
  isMergeInProgress,
  isRebaseInProgress,
  getGitState,
  validateGitState,
  createBranch,
  checkoutBranch,
  createBackupBranch,
  commitChanges,
  generateBranchName,
  branchExists,
  deleteBranch,
} from './git/index.js';

// Lock management
export type { LockfileContent, LockResult } from './lock/index.js';
export {
  getLockfilePath,
  readLockfile,
  removeLockfile,
  acquireLock,
  releaseLock,
  setupAutoRelease,
  formatLockInfo,
} from './lock/index.js';

// Wave orchestration
export type {
  SubagentType,
  ExecutionTask,
  ExecutionWave,
  TaskResult,
} from './waves/index.js';
export {
  generateWavesForItem,
  executeTask,
  executeWave,
  executeItem,
} from './waves/index.js';
