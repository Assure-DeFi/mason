'use client';

import { clsx } from 'clsx';
import {
  Play,
  Terminal,
  X,
  Check,
  Copy,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useCallback } from 'react';

import { ClaudeCodeExplainer } from '@/components/ui/ClaudeCodeExplainer';

interface UnifiedExecuteButtonProps {
  /** IDs of approved items to execute */
  itemIds: string[];
  /** Optional className */
  className?: string;
}

export function UnifiedExecuteButton({
  itemIds,
  className,
}: UnifiedExecuteButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showClaudeCodeExplainer, setShowClaudeCodeExplainer] = useState(false);

  const command = `/execute-approved --ids ${itemIds.join(',')}`;

  const handleCopyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => {
        setCopied(false);
        setShowModal(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  }, [command]);

  if (itemIds.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 bg-gold text-navy font-medium text-sm hover:opacity-90 transition-opacity',
          className,
        )}
      >
        <Play className="w-4 h-4" />
        Execute Approved ({itemIds.length})
      </button>

      {/* Execute Modal - CLI Only */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-navy border border-gray-800 w-full max-w-lg mx-4 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">
                Execute {itemIds.length} Approved Item
                {itemIds.length !== 1 ? 's' : ''}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-400 text-sm">
                Ready to implement these improvements? Copy the command below
                and paste it in Claude Code.
              </p>

              {/* Command Box */}
              <div
                className={clsx(
                  'flex items-center gap-3 p-4 rounded-lg border bg-black/50 font-mono cursor-pointer transition-all',
                  copyError
                    ? 'border-red-600 bg-red-900/20'
                    : copied
                      ? 'border-green-600 bg-green-900/20'
                      : 'border-gray-700 hover:border-gold/50',
                )}
                onClick={handleCopyCommand}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleCopyCommand();
                  }
                }}
              >
                <Terminal className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <code className="flex-1 text-gold text-sm overflow-x-auto whitespace-nowrap">
                  {command}
                </code>
                <div className="flex-shrink-0">
                  {copyError ? (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  ) : copied ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Status message */}
              {copied && (
                <p className="text-green-400 text-sm text-center">
                  Command copied! Paste in Claude Code to execute.
                </p>
              )}
              {copyError && (
                <p className="text-red-400 text-sm text-center">
                  Copy failed. Try selecting the command and copying manually.
                </p>
              )}

              {/* What's Claude Code link */}
              <button
                onClick={() => setShowClaudeCodeExplainer(true)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                What&apos;s Claude Code?
              </button>

              {/* Troubleshooting */}
              <div className="pt-4 border-t border-gray-800">
                <button
                  onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showTroubleshooting ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Command not working?
                </button>

                {showTroubleshooting && (
                  <div className="mt-3 p-3 bg-black/30 border border-gray-800 rounded-lg text-sm text-gray-400 space-y-2">
                    <div className="flex items-start gap-2">
                      <Terminal className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                      <span>
                        Make sure Claude Code is running in your project
                        directory
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Terminal className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                      <span>Ensure you have approved items ready</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Terminal className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                      <span>
                        Check that{' '}
                        <code className="px-1 bg-black rounded text-gold">
                          mason.config.json
                        </code>{' '}
                        exists
                      </span>
                    </div>
                    <a
                      href="/faq"
                      className="block mt-2 text-gold hover:underline"
                    >
                      See full troubleshooting guide &rarr;
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-black/20 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyCommand}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-semibold text-sm rounded hover:opacity-90 transition-opacity"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Command
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claude Code Explainer Modal */}
      <ClaudeCodeExplainer
        isOpen={showClaudeCodeExplainer}
        onClose={() => setShowClaudeCodeExplainer(false)}
      />
    </>
  );
}

export default UnifiedExecuteButton;
