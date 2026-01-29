'use client';

import { X, Terminal, Download, ExternalLink, Zap } from 'lucide-react';
import { useEffect, useCallback } from 'react';

interface ClaudeCodeExplainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClaudeCodeExplainer({
  isOpen,
  onClose,
}: ClaudeCodeExplainerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-lg border border-gray-800 bg-navy shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Terminal className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              What is Claude Code?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-gray-300 leading-relaxed">
              <strong className="text-white">Claude Code</strong> is
              Anthropic&apos;s official command-line interface for Claude. It
              lets you run AI-powered commands directly in your terminal while
              working on code.
            </p>
          </div>

          {/* How Mason uses it */}
          <div className="p-4 bg-gold/5 border border-gold/30 rounded-lg">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gold mb-2">
              <Zap className="w-4 h-4" />
              How Mason Uses Claude Code
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-gold">1.</span>
                <span>
                  Run{' '}
                  <code className="px-1 bg-black rounded text-gold">
                    /pm-review
                  </code>{' '}
                  to analyze your codebase
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">2.</span>
                <span>Improvements appear in this Mason dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">3.</span>
                <span>
                  Run{' '}
                  <code className="px-1 bg-black rounded text-gold">
                    /execute-approved
                  </code>{' '}
                  to implement changes
                </span>
              </li>
            </ul>
          </div>

          {/* Installation */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">How to Install</h3>
            <div className="p-4 bg-black/30 border border-gray-700 rounded-lg space-y-3">
              <p className="text-sm text-gray-400">
                Install Claude Code from Anthropic&apos;s official website:
              </p>
              <a
                href="https://www.anthropic.com/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                Get Claude Code
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Requirements */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Requirements: macOS, Linux, or Windows (WSL)</p>
            <p>
              You&apos;ll need an Anthropic API key or Claude Pro subscription
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gold text-navy font-semibold rounded hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClaudeCodeExplainer;
