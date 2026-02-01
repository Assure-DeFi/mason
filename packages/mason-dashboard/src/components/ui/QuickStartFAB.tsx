'use client';

import { clsx } from 'clsx';
import { HelpCircle, X, Copy, Check, ExternalLink } from 'lucide-react';
import { useState, useCallback } from 'react';

import { ClaudeCodeExplainer } from './ClaudeCodeExplainer';

interface QuickStartFABProps {
  className?: string;
}

export function QuickStartFAB({ className }: QuickStartFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [showClaudeCodeExplainer, setShowClaudeCodeExplainer] = useState(false);

  const handleCopy = useCallback(async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'fixed right-6 z-40 w-14 h-14 rounded-full bg-gold text-navy shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center fixed-bottom-safe gpu-accelerated',
          isOpen && 'bg-gray-800 text-white',
          className,
        )}
        aria-label={isOpen ? 'Close quick reference' : 'Open quick reference'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <HelpCircle className="w-6 h-6" />
        )}
      </button>

      {/* Quick Reference Panel */}
      {isOpen && (
        <div
          className="fixed right-6 z-40 w-80 bg-navy border border-gray-800 rounded-lg shadow-2xl overflow-hidden animate-[slideUp_0.2s_ease-out] gpu-accelerated"
          style={{
            bottom: 'calc(max(1.5rem, env(safe-area-inset-bottom)) + 4rem)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-800 bg-black/20">
            <h3 className="font-semibold text-white">Quick Reference</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Mason workflow at a glance
            </p>
          </div>

          {/* Steps */}
          <div className="p-4 space-y-4">
            {/* Step 1: Analyze */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold">
                  1
                </span>
                <span className="text-sm font-medium text-white">
                  Analyze your codebase
                </span>
              </div>
              <div className="ml-8">
                <button
                  onClick={() => handleCopy('/pm-review')}
                  className="flex items-center justify-between w-full px-3 py-2.5 bg-black/30 border border-gray-700 rounded text-sm font-mono text-gold hover:border-gold/50 transition-colors"
                >
                  <span>/pm-review</span>
                  {copiedCommand === '/pm-review' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Review */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold">
                  2
                </span>
                <span className="text-sm font-medium text-white">
                  Review & Approve
                </span>
              </div>
              <p className="ml-8 text-xs text-gray-400">
                Items appear here. Click to review, then approve the ones you
                want to implement.
              </p>
            </div>

            {/* Step 3: Execute */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold">
                  3
                </span>
                <span className="text-sm font-medium text-white">
                  Execute approved items
                </span>
              </div>
              <div className="ml-8">
                <button
                  onClick={() => handleCopy('/execute-approved')}
                  className="flex items-center justify-between w-full px-3 py-2.5 bg-black/30 border border-gray-700 rounded text-sm font-mono text-gold hover:border-gold/50 transition-colors"
                >
                  <span>/execute-approved</span>
                  {copiedCommand === '/execute-approved' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-800 bg-black/20 flex items-center justify-between">
            <button
              onClick={() => setShowClaudeCodeExplainer(true)}
              className="text-xs text-gray-400 hover:text-gold transition-colors"
            >
              What&apos;s Claude Code?
            </button>
            <a
              href="/faq"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gold transition-colors"
            >
              Full Guide
              <ExternalLink className="w-3 h-3" />
            </a>
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

export default QuickStartFAB;
