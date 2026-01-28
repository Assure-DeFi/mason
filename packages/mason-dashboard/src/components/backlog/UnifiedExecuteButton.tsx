'use client';

import { useState, useEffect } from 'react';
import {
  Play,
  Terminal,
  Cloud,
  X,
  Check,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

interface UnifiedExecuteButtonProps {
  /** IDs of approved items to execute */
  itemIds: string[];
  /** Repository ID for remote execution */
  repositoryId: string | null;
  /** Callback when remote execution starts */
  onRemoteExecute?: (itemIds: string[]) => void;
  /** Whether remote execution is available */
  remoteAvailable?: boolean;
  /** Optional className */
  className?: string;
}

type ExecuteMethod = 'cli' | 'remote';

const STORAGE_KEY = 'mason_execute_preference';

export function UnifiedExecuteButton({
  itemIds,
  repositoryId,
  onRemoteExecute,
  remoteAvailable = true,
  className,
}: UnifiedExecuteButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState<ExecuteMethod | null>(
    null,
  );

  // Load preferred method from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'cli' || saved === 'remote') {
      setPreferredMethod(saved);
    }
  }, []);

  // Save preference
  const savePreference = (method: ExecuteMethod) => {
    localStorage.setItem(STORAGE_KEY, method);
    setPreferredMethod(method);
  };

  const command = `/execute-approved --ids ${itemIds.join(',')}`;

  const handleClick = () => {
    // If user has a preference, use it directly
    if (preferredMethod === 'cli') {
      handleCopyCommand();
    } else if (
      preferredMethod === 'remote' &&
      remoteAvailable &&
      repositoryId
    ) {
      handleRemoteExecute();
    } else {
      // Show modal for selection
      setShowModal(true);
    }
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
      setShowModal(false);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const handleRemoteExecute = () => {
    if (onRemoteExecute) {
      onRemoteExecute(itemIds);
    }
    setShowModal(false);
  };

  const handleSelectMethod = (method: ExecuteMethod, remember: boolean) => {
    if (remember) {
      savePreference(method);
    }

    if (method === 'cli') {
      handleCopyCommand();
    } else {
      handleRemoteExecute();
    }
  };

  if (itemIds.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 font-medium text-sm transition-opacity',
          copyError
            ? 'bg-red-600 text-white'
            : 'bg-gold text-navy hover:opacity-90',
          className,
        )}
      >
        {copyError ? (
          <>
            <AlertCircle className="w-4 h-4" />
            Copy failed
          </>
        ) : copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied!
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Execute Approved ({itemIds.length})
          </>
        )}
      </button>

      {/* Method Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-navy border border-gray-800 w-full max-w-md mx-4 rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">
                How do you want to execute?
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 space-y-3">
              {/* CLI Option */}
              <button
                onClick={() => handleSelectMethod('cli', false)}
                className={clsx(
                  'w-full flex items-start gap-4 p-4 rounded-lg border transition-all text-left',
                  preferredMethod === 'cli'
                    ? 'border-gold bg-gold/5'
                    : 'border-gray-700 hover:border-gray-600 bg-black/30',
                )}
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-cyan-500/20">
                  <Terminal className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      In Claude Code (CLI)
                    </span>
                    {preferredMethod === 'cli' && (
                      <span className="px-2 py-0.5 text-xs bg-gold/20 text-gold rounded">
                        Preferred
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Copies command to clipboard. Paste in Claude Code to
                    execute.
                  </p>
                </div>
              </button>

              {/* Remote Option */}
              <button
                onClick={() => handleSelectMethod('remote', false)}
                disabled={!remoteAvailable || !repositoryId}
                className={clsx(
                  'w-full flex items-start gap-4 p-4 rounded-lg border transition-all text-left',
                  !remoteAvailable || !repositoryId
                    ? 'opacity-50 cursor-not-allowed border-gray-800'
                    : preferredMethod === 'remote'
                      ? 'border-gold bg-gold/5'
                      : 'border-gray-700 hover:border-gray-600 bg-black/30',
                )}
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-purple-500/20">
                  <Cloud className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      From Dashboard (Remote)
                    </span>
                    {preferredMethod === 'remote' && (
                      <span className="px-2 py-0.5 text-xs bg-gold/20 text-gold rounded">
                        Preferred
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {!repositoryId
                      ? 'Select a repository first'
                      : !remoteAvailable
                        ? 'Remote execution not available'
                        : 'Execute directly from dashboard with live progress'}
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-black/20">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    id="remember-preference"
                    className="w-4 h-4 rounded border-gray-600 bg-black text-gold focus:ring-gold focus:ring-offset-0"
                    onChange={(e) => {
                      if (e.target.checked && preferredMethod) {
                        savePreference(preferredMethod);
                      }
                    }}
                  />
                  Remember my choice
                </label>

                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UnifiedExecuteButton;
