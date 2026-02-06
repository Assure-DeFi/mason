'use client';

import {
  ChevronUp,
  Loader2,
  Sparkles,
  Lightbulb,
  Zap,
  Target,
  Search,
} from 'lucide-react';

import { MasonAvatar, MasonTagline } from '@/components/brand';

interface AnalysisRunInfo {
  id: string;
  startedAt: string;
  repositoryName?: string;
}

interface EmptyStateOnboardingProps {
  /** Callback to refresh the items list */
  onRefresh?: () => void;
  /** Information about currently running analysis */
  runningAnalysis?: AnalysisRunInfo | null;
  /** Whether no repository is selected */
  noRepoSelected?: boolean;
  /** Name of selected repository */
  repositoryName?: string;
  /** Callback to open the Generate Ideas wizard */
  onGenerateIdeas?: () => void;
}

export function EmptyStateOnboarding({
  onRefresh,
  runningAnalysis,
  noRepoSelected,
  repositoryName,
  onGenerateIdeas,
}: EmptyStateOnboardingProps) {
  // Show "analysis running" state
  if (runningAnalysis) {
    return (
      <div className="mason-entrance flex flex-col items-center justify-center py-16 px-4">
        {/* Mason Avatar with pulse animation */}
        <div className="mb-8 relative">
          <MasonAvatar size="lg" variant="minimal" />
          <div className="absolute -bottom-2 -right-2 bg-gold rounded-full p-1.5 animate-pulse">
            <Loader2 className="w-4 h-4 text-navy animate-spin" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="mb-2 text-2xl font-bold text-white text-center">
          Analysis in progress...
        </h2>
        <p className="mb-6 text-gray-400 text-center max-w-md">
          Mason is analyzing{' '}
          {runningAnalysis.repositoryName ? (
            <span className="text-gold">{runningAnalysis.repositoryName}</span>
          ) : (
            'your codebase'
          )}{' '}
          for potential improvements.
        </p>

        {/* Progress indicator */}
        <div className="w-full max-w-xs mb-8">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full animate-progress-indeterminate" />
          </div>
        </div>

        {/* What's happening */}
        <div className="w-full max-w-md p-4 bg-black/30 border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-400 mb-3">
            <span className="font-medium text-white">What Mason is doing:</span>
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-gold animate-spin" />
              Scanning codebase patterns
            </li>
            <li className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-gold animate-spin" />
              Identifying improvement opportunities
            </li>
            <li className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-gold animate-spin" />
              Generating detailed PRDs
            </li>
          </ul>
        </div>

        {/* Time estimate */}
        <p className="mt-6 text-xs text-gray-500 text-center">
          This typically takes 2-5 minutes depending on codebase size.
          <br />
          Items will appear automatically when ready.
        </p>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Refresh manually
          </button>
        )}
      </div>
    );
  }

  // Show "no repo selected" state
  if (noRepoSelected) {
    return (
      <div className="mason-entrance flex flex-col items-center justify-center py-16 px-4">
        {/* Mason Avatar */}
        <div className="mb-8">
          <MasonAvatar size="lg" variant="minimal" />
        </div>

        {/* Heading */}
        <h2 className="mb-2 text-2xl font-bold text-white text-center">
          Select a repository
        </h2>
        <MasonTagline size="sm" variant="muted" className="mb-4 text-center" />
        <p className="mb-8 text-gray-400 text-center max-w-md">
          Choose a repository from the dropdown above to view its backlog items.
        </p>

        {/* Arrow pointing up */}
        <div className="animate-bounce text-gold mb-4">
          <ChevronUp className="w-8 h-8" />
        </div>
      </div>
    );
  }

  // Default: Show onboarding state (no items yet)
  const modes = [
    {
      icon: Zap,
      label: 'Banger Mode',
      desc: 'One game-changing idea with deep analysis',
    },
    {
      icon: Search,
      label: 'Full Review',
      desc: 'Comprehensive scan across all categories',
    },
    {
      icon: Target,
      label: 'Focused Review',
      desc: 'Deep dive into a specific area',
    },
    {
      icon: Lightbulb,
      label: 'Quick Wins',
      desc: 'Fast improvements you can ship today',
    },
  ];

  return (
    <div className="mason-entrance flex flex-col items-center justify-center py-20 px-4">
      {/* Mason Avatar */}
      <div className="mb-6">
        <MasonAvatar size="lg" variant="minimal" />
      </div>

      {/* Heading */}
      <h2 className="mb-2 text-2xl font-bold text-white text-center">
        {repositoryName ? (
          <>
            Ready to improve <span className="text-gold">{repositoryName}</span>
            ?
          </>
        ) : (
          'Ready to find improvements?'
        )}
      </h2>
      <MasonTagline size="sm" variant="muted" className="mb-8 text-center" />

      {/* Big Generate Button */}
      <button
        onClick={onGenerateIdeas}
        className="group flex items-center gap-3 px-8 py-4 bg-gold text-navy font-bold text-lg hover:bg-gold/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <Sparkles className="w-6 h-6 transition-transform group-hover:rotate-12" />
        GENERATE NEW IDEAS
      </button>

      {/* Supporting text */}
      <p className="mt-4 text-gray-500 text-sm text-center max-w-sm">
        Explore different review modes to discover improvements for your
        codebase
      </p>

      {/* Mode previews */}
      <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-lg">
        {modes.map((mode) => (
          <button
            key={mode.label}
            onClick={onGenerateIdeas}
            className="flex items-start gap-3 p-3 bg-black/30 border border-gray-800 hover:border-gold/40 transition-colors text-left"
          >
            <mode.icon className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-white block">
                {mode.label}
              </span>
              <span className="text-xs text-gray-500">{mode.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-10 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Already ran a review? Click to refresh
        </button>
      )}
    </div>
  );
}

export default EmptyStateOnboarding;
