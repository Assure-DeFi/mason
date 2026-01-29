'use client';

import { clsx } from 'clsx';
import { Terminal, Eye, Play, Check } from 'lucide-react';

import type { StatusCounts } from '@/types/backlog';

interface JourneyMapProps {
  counts: StatusCounts;
  className?: string;
}

type JourneyStep = 'analyze' | 'review' | 'execute' | 'done';

function determineCurrentStep(counts: StatusCounts): JourneyStep {
  // If we have completed items, we're in "done" phase
  if (counts.completed > 0) {
    return 'done';
  }

  // If we have items in progress, we're executing
  if (counts.in_progress > 0) {
    return 'execute';
  }

  // If we have approved items, we're ready to execute
  if (counts.approved > 0) {
    return 'execute';
  }

  // If we have new items to review
  if (counts.new > 0) {
    return 'review';
  }

  // If total is 0, we need to analyze
  if (counts.total === 0) {
    return 'analyze';
  }

  // Default to review if we have items but none are new
  return 'review';
}

const STEPS = [
  {
    id: 'analyze' as const,
    label: 'CLI: Analyze',
    icon: Terminal,
    description: 'Run /pm-review',
  },
  {
    id: 'review' as const,
    label: 'Dashboard: Review',
    icon: Eye,
    description: 'Approve items',
  },
  {
    id: 'execute' as const,
    label: 'CLI: Execute',
    icon: Play,
    description: 'Run /execute-approved',
  },
  {
    id: 'done' as const,
    label: 'Done',
    icon: Check,
    description: 'Implementation complete',
  },
];

export function JourneyMap({ counts, className }: JourneyMapProps) {
  const currentStep = determineCurrentStep(counts);
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div
      className={clsx(
        'flex items-center justify-center gap-1 py-2 px-4 bg-black/20 border-b border-gray-800',
        className,
      )}
    >
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step */}
            <div
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                isActive && 'bg-gold/20 text-gold border border-gold/30',
                isComplete && 'bg-green-900/30 text-green-400',
                isFuture && 'text-gray-500',
              )}
              title={step.description}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>

            {/* Arrow between steps */}
            {index < STEPS.length - 1 && (
              <div
                className={clsx(
                  'mx-1 text-xs',
                  index < currentIndex ? 'text-green-400' : 'text-gray-600',
                )}
              >
                &rarr;
              </div>
            )}
          </div>
        );
      })}

      {/* You are here indicator for mobile */}
      <div className="sm:hidden ml-2 text-xs text-gray-500">
        <span className="text-gold">Step {currentIndex + 1}</span>/
        {STEPS.length}
      </div>
    </div>
  );
}

export default JourneyMap;
