'use client';

/**
 * ExecutionSummaryModal - Celebratory completion summary
 *
 * Shows accomplishments, benefits, and files changed after successful execution.
 * Includes confetti celebration and bullish messaging.
 */

import { X, ExternalLink, FileCode, Clock, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { ExecutionSummary } from '@/lib/execution/progress';

// Lazy-load confetti to reduce bundle size
const ConfettiCelebration = dynamic(
  () => import('./ConfettiCelebration').then((mod) => mod.ConfettiCelebration),
  { ssr: false },
);

interface ExecutionSummaryModalProps {
  summary: ExecutionSummary;
  onClose: () => void;
}

export function ExecutionSummaryModal({
  summary,
  onClose,
}: ExecutionSummaryModalProps) {
  const {
    itemTitle,
    accomplishments,
    benefits,
    filesChanged,
    totalLinesChanged,
    elapsedTime,
    prUrl,
  } = summary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="execution-summary-title"
    >
      {/* Confetti Animation */}
      <ConfettiCelebration />

      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-navy shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-900/50">
              <Sparkles className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h2
                id="execution-summary-title"
                className="text-2xl font-bold text-white"
              >
                Execution Complete!
              </h2>
              <p className="text-sm text-gray-400">
                Mason just shipped real improvements to your codebase.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Item Title */}
          <div className="rounded-lg bg-gold/10 border border-gold/30 p-4">
            <div className="text-sm text-gold/70 mb-1">Completed</div>
            <div className="text-lg font-semibold text-white">{itemTitle}</div>
          </div>

          {/* What You Accomplished */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              What You Accomplished
            </h3>
            <ul className="space-y-2">
              {accomplishments.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-white">
                  <span className="text-gold mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Benefits
            </h3>
            <ul className="space-y-2">
              {benefits.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-300">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Files Changed */}
          {filesChanged.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Files Changed ({filesChanged.length})
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg bg-black/50 p-3">
                {filesChanged.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm font-mono"
                  >
                    <FileCode className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300 truncate">{file.path}</span>
                    <span className="text-green-400 flex-shrink-0">
                      +{file.linesAdded}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {totalLinesChanged} total lines changed
              </div>
            </div>
          )}

          {/* PR Link */}
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-800 p-4 text-gold hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="h-5 w-5" />
              View Pull Request
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Elapsed: {elapsedTime}</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gold text-navy font-semibold rounded-md hover:bg-gold/90 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutionSummaryModal;
