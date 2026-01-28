'use client';

import { useState } from 'react';
import {
  Sparkles,
  Terminal,
  ArrowRight,
  Check,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

interface EmptyStateOnboardingProps {
  onRefresh?: () => void;
}

const STEPS = [
  {
    number: 1,
    title: 'Open Claude Code in your project',
    description: 'Navigate to your project directory and start Claude Code',
    command: null,
  },
  {
    number: 2,
    title: 'Run the PM review command',
    description: 'This analyzes your codebase and generates improvement ideas',
    command: '/pm-review',
  },
  {
    number: 3,
    title: 'Come back here to see results',
    description: 'Improvements will appear in this dashboard automatically',
    command: null,
  },
];

export function EmptyStateOnboarding({ onRefresh }: EmptyStateOnboardingProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [errorStep, setErrorStep] = useState<number | null>(null);

  const handleCopy = async (command: string, stepNumber: number) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedStep(stepNumber);
      setErrorStep(null);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setErrorStep(stepNumber);
      setTimeout(() => setErrorStep(null), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon */}
      <div className="mb-6 rounded-2xl bg-gold/10 p-4">
        <Sparkles className="h-12 w-12 text-gold" />
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-xl font-semibold text-white text-center">
        Ready to find improvements in your codebase?
      </h2>
      <p className="mb-8 text-gray-400 text-center max-w-md">
        Run your first PM review to automatically discover and prioritize
        improvement opportunities.
      </p>

      {/* Steps */}
      <div className="w-full max-w-lg space-y-4 mb-8">
        {STEPS.map((step, index) => (
          <div
            key={step.number}
            className="flex gap-4 p-4 rounded-lg border border-gray-800 bg-black/30 hover:border-gray-700 transition-colors"
          >
            {/* Step Number */}
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 text-gold font-medium text-sm">
              {step.number}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white mb-1">{step.title}</h3>
              <p className="text-sm text-gray-500 mb-2">{step.description}</p>

              {/* Command if available */}
              {step.command && (
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 px-3 py-2 rounded bg-black font-mono text-sm text-gold border border-gray-800">
                    {step.command}
                  </code>
                  <button
                    onClick={() => handleCopy(step.command!, step.number)}
                    className={`flex-shrink-0 p-2 rounded border transition-colors ${
                      errorStep === step.number
                        ? 'border-red-600 bg-red-900/30 text-red-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                    title={
                      errorStep === step.number
                        ? 'Copy failed - try selecting and copying manually'
                        : 'Copy to clipboard'
                    }
                  >
                    {errorStep === step.number ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : copiedStep === step.number ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Arrow for flow indication */}
            {index < STEPS.length - 1 && (
              <div className="hidden sm:flex items-center">
                <ArrowRight className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Start Hint */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gold/5 border border-gold/20">
        <Terminal className="w-4 h-4 text-gold" />
        <span className="text-sm text-gray-300">
          Quick start: Copy{' '}
          <code className="px-1 rounded bg-black text-gold">/pm-review</code>{' '}
          and paste in Claude Code
        </span>
        <CopyButton
          text="/pm-review"
          size="sm"
          variant="ghost"
          showToast
          toastMessage="Command copied! Paste in Claude Code"
        />
      </div>

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
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
            Assure DeFi®
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
          Visit assuredefi.com →
        </a>
      </div>
    </div>
  );
}

export default EmptyStateOnboarding;
