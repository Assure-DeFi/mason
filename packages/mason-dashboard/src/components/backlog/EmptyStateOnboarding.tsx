'use client';

import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

import { MasonTagline } from '@/components/brand';
import { ClaudeCodeExplainer } from '@/components/ui/ClaudeCodeExplainer';
import { CopyCommand } from '@/components/ui/CopyCommand';

interface EmptyStateOnboardingProps {
  onRefresh?: () => void;
}

export function EmptyStateOnboarding({ onRefresh }: EmptyStateOnboardingProps) {
  const [showClaudeCodeExplainer, setShowClaudeCodeExplainer] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  return (
    <div className="mason-entrance flex flex-col items-center justify-center py-16 px-4">
      {/* Mason Icon */}
      <div className="mb-8 flex items-center justify-center w-20 h-20 rounded-full bg-gold/20">
        <Sparkles className="w-10 h-10 text-gold" />
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-2xl font-bold text-white text-center">
        Ready to find improvements?
      </h2>
      <MasonTagline size="sm" variant="muted" className="mb-4 text-center" />
      <p className="mb-8 text-gray-400 text-center max-w-md">
        Copy and paste this command into Claude Code to analyze your codebase.
      </p>

      {/* Main Command */}
      <div className="w-full max-w-md mb-6">
        <CopyCommand
          command="/pm-review"
          size="lg"
          showPersistentToast={true}
        />
      </div>

      {/* What's Claude Code? Link */}
      <button
        onClick={() => setShowClaudeCodeExplainer(true)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition-colors mb-8"
      >
        <HelpCircle className="w-4 h-4" />
        What&apos;s Claude Code?
      </button>

      {/* Troubleshooting Panel */}
      <div className="w-full max-w-md">
        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors w-full justify-center"
        >
          {showTroubleshooting ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Command not working?
        </button>

        {showTroubleshooting && (
          <div className="mt-4 p-4 bg-black/30 border border-gray-800 rounded-lg text-sm text-gray-400 space-y-2">
            <div className="flex items-start gap-2">
              <Terminal className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
              <span>
                Make sure Claude Code is running in your project directory
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Terminal className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
              <span>
                Check that{' '}
                <code className="px-1 bg-black rounded text-gold">
                  mason.config.json
                </code>{' '}
                exists in your project root
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Terminal className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
              <span>
                Try running{' '}
                <code className="px-1 bg-black rounded text-gold">
                  ls .claude/commands/
                </code>{' '}
                to verify Mason is installed
              </span>
            </div>
            <a href="/faq" className="block mt-3 text-gold hover:underline">
              See full troubleshooting guide &rarr;
            </a>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-8 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Already ran a review? Click to refresh
        </button>
      )}

      {/* Brand Attribution */}
      <div className="mt-12 pt-8 border-t border-gray-800 text-center">
        <p className="text-sm text-gray-500">
          Built by{' '}
          <a
            href="https://assuredefi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            Assure DeFi
          </a>
        </p>
        <p className="mt-1 text-xs text-gray-600">
          2,000+ projects &amp; $2B+ secured since 2021.
        </p>
        <a
          href="https://assuredefi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-gray-400 transition-colors hover:text-gold"
        >
          Visit assuredefi.com &rarr;
        </a>
      </div>

      {/* Claude Code Explainer Modal */}
      <ClaudeCodeExplainer
        isOpen={showClaudeCodeExplainer}
        onClose={() => setShowClaudeCodeExplainer(false)}
      />
    </div>
  );
}

export default EmptyStateOnboarding;
