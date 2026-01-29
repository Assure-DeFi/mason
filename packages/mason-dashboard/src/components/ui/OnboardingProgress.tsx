'use client';

import { clsx } from 'clsx';
import {
  Check,
  Circle,
  User,
  Database,
  Search,
  Play,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import type { StatusCounts } from '@/types/backlog';

interface OnboardingProgressProps {
  isConfigured: boolean;
  counts: StatusCounts;
  hasSession: boolean;
  className?: string;
}

interface OnboardingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  isComplete: boolean;
  description: string;
}

const STORAGE_KEY = 'mason_onboarding_dismissed';

export function OnboardingProgress({
  isConfigured,
  counts,
  hasSession,
  className,
}: OnboardingProgressProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Default to dismissed to prevent flash
  const [isExpanded, setIsExpanded] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  // Calculate completion steps
  const steps: OnboardingStep[] = useMemo(
    () => [
      {
        id: 'account',
        label: 'Account created',
        icon: <User className="w-4 h-4" />,
        isComplete: hasSession,
        description: 'Sign in with GitHub',
      },
      {
        id: 'database',
        label: 'Database connected',
        icon: <Database className="w-4 h-4" />,
        isComplete: isConfigured,
        description: 'Connect your Supabase database',
      },
      {
        id: 'first-review',
        label: 'Run first /pm-review',
        icon: <Search className="w-4 h-4" />,
        isComplete: counts.total > 0,
        description: 'Analyze your codebase',
      },
      {
        id: 'first-execute',
        label: 'Execute an item',
        icon: <Play className="w-4 h-4" />,
        isComplete: counts.completed > 0,
        description: 'Implement an approved improvement',
      },
    ],
    [hasSession, isConfigured, counts.total, counts.completed],
  );

  const completedCount = steps.filter((s) => s.isComplete).length;
  const isAllComplete = completedCount === steps.length;

  // Auto-dismiss when all steps complete
  useEffect(() => {
    if (isAllComplete && !isDismissed) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsDismissed(true);
    }
  }, [isAllComplete, isDismissed]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  // Don't show if dismissed or all complete
  if (isDismissed || isAllComplete) {
    return null;
  }

  // Find next incomplete step
  const nextStep = steps.find((s) => !s.isComplete);

  return (
    <div
      className={clsx(
        'border border-gray-800 bg-black/30 rounded-lg overflow-hidden',
        className,
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className={clsx(
                  'w-2 h-2 rounded-full',
                  step.isComplete ? 'bg-green-500' : 'bg-gray-600',
                )}
              />
            ))}
          </div>
          <span className="text-sm text-white font-medium">
            Your Progress ({completedCount}/{steps.length} complete)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {nextStep && (
            <span className="text-xs text-gray-400">
              Next: {nextStep.label}
            </span>
          )}
          <ChevronRight
            className={clsx(
              'w-4 h-4 text-gray-400 transition-transform',
              isExpanded && 'rotate-90',
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-800">
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={clsx(
                  'flex items-center gap-3',
                  step.isComplete ? 'opacity-60' : '',
                )}
              >
                <div
                  className={clsx(
                    'flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0',
                    step.isComplete
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-800 text-gray-400',
                  )}
                >
                  {step.isComplete ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={clsx(
                      'text-sm font-medium',
                      step.isComplete ? 'text-green-300' : 'text-white',
                    )}
                  >
                    {step.label}
                  </div>
                  {!step.isComplete && (
                    <div className="text-xs text-gray-500">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dismiss link */}
          <button
            onClick={handleDismiss}
            className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            I know what I&apos;m doing - hide this
          </button>
        </div>
      )}
    </div>
  );
}

export default OnboardingProgress;
