'use client';

import { clsx } from 'clsx';
import { X, FileText, Check, Clock, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { STORAGE_KEYS } from '@/lib/constants';
import type {
  BacklogItem,
  BacklogStatus,
  DependencyAnalysis,
} from '@/types/backlog';

/**
 * Safely parse inline markdown (bold and code) without using dangerouslySetInnerHTML
 * Returns React elements instead of HTML strings
 */
function parseInlineMarkdown(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  let currentIndex = 0;
  let keyIndex = 0;

  // Combined regex for bold (**text**) and inline code (`text`)
  const pattern = /(\*\*(.+?)\*\*)|(`([^`]+)`)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      result.push(text.slice(currentIndex, match.index));
    }

    if (match[1]) {
      // Bold text - match[2] contains the text inside **
      result.push(
        <strong key={keyIndex++} className="font-semibold text-white">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      // Inline code - match[4] contains the text inside ``
      result.push(
        <code
          key={keyIndex++}
          className="px-1 py-0.5 bg-black rounded text-gold font-mono text-sm"
        >
          {match[4]}
        </code>,
      );
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (currentIndex < text.length) {
    result.push(text.slice(currentIndex));
  }

  return result.length > 0 ? result : [text];
}

import { BenefitsGrid } from './benefits-grid';
import { ItemTimeline } from './ItemTimeline';
import { PriorityDots } from './priority-dots';
import { QuickWinBadge } from './QuickWinBadge';
import { RiskAnalysisView } from './RiskAnalysisView';
import { RiskBadge } from './RiskBadge';
import { TypeBadge } from './type-badge';

export type ViewMode = 'details' | 'prd' | 'timeline' | 'risk';

interface ItemDetailModalProps {
  item: BacklogItem;
  onClose: () => void;
  onUpdateStatus: (id: string, status: BacklogStatus) => Promise<void>;
  onGeneratePrd: (id: string) => Promise<void>;
  initialViewMode?: ViewMode;
}

export function ItemDetailModal({
  item,
  onClose,
  onUpdateStatus,
  onGeneratePrd,
  initialViewMode = 'details',
}: ItemDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Risk analysis state
  const [riskAnalysis, setRiskAnalysis] = useState<DependencyAnalysis | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const focusTrapRef = useFocusTrap(true);

  // Fetch existing risk analysis on mount
  useEffect(() => {
    const fetchRiskAnalysis = async () => {
      try {
        const response = await fetch(`/api/backlog/${item.id}/risk-analysis`);
        if (response.ok) {
          const data = await response.json();
          if (data.analysis) {
            setRiskAnalysis(data.analysis);
          }
        }
      } catch {
        // Silent fail - analysis is optional
      }
    };

    void fetchRiskAnalysis();
  }, [item.id]);

  // Handle triggering risk analysis
  const handleAnalyzeRisk = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Get GitHub token from localStorage
      const githubToken = localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);

      if (!githubToken) {
        setAnalysisError(
          'GitHub token not found. Please reconnect your GitHub account.',
        );
        return;
      }

      const response = await fetch(`/api/backlog/${item.id}/analyze-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze risk');
      }

      const data = await response.json();
      setRiskAnalysis(data.analysis);
      setSuccessMessage('Risk Analysis Complete!');
      setShowSuccess(true);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Failed to analyze risk',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [item.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if focused on an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'g':
          if (!isGenerating && !item.prd_content) {
            void handleGeneratePrd();
          }
          break;
        case 'a':
          if (item.status === 'new' && !isUpdating) {
            void handleStatusChange('approved');
          }
          break;
        case 'x':
          if (item.status === 'new' && !isUpdating) {
            void handleStatusChange('rejected');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [item, isGenerating, isUpdating, onClose]);

  const handleGeneratePrd = async () => {
    setIsGenerating(true);
    try {
      await onGeneratePrd(item.id);
      setViewMode('prd');
      setSuccessMessage('PRD Generated!');
      setShowSuccess(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (status: BacklogStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(item.id, status);
      if (status === 'approved') {
        setSuccessMessage('Approved!');
        setShowSuccess(true);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Combo action: Approve + Generate PRD
  const handleApproveAndGeneratePrd = async () => {
    setIsUpdating(true);
    setIsGenerating(true);
    try {
      await onUpdateStatus(item.id, 'approved');
      await onGeneratePrd(item.id);
      setViewMode('prd');
      setSuccessMessage('Approved & PRD Generated!');
      setShowSuccess(true);
    } finally {
      setIsUpdating(false);
      setIsGenerating(false);
    }
  };

  // Get priority label based on score
  const getPriorityLabel = () => {
    if (item.impact_score >= 9) {
      return 'Critical Priority';
    }
    if (item.impact_score >= 7) {
      return 'High Priority';
    }
    if (item.impact_score >= 5) {
      return 'Medium Priority';
    }
    return 'Low Priority';
  };

  // Simple markdown-like rendering for PRD content
  const renderPrdContent = (content: string) => {
    // Split into lines and process
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];

    lines.forEach((line, index) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${index}`}
              className="my-3 p-3 bg-black rounded border border-gray-800 overflow-x-auto font-mono text-sm text-gray-300"
            >
              {codeContent.join('\n')}
            </pre>,
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h4
            key={index}
            className="mt-4 mb-2 text-sm font-semibold text-white"
          >
            {line.slice(4)}
          </h4>,
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3
            key={index}
            className="mt-5 mb-2 text-base font-semibold text-white"
          >
            {line.slice(3)}
          </h3>,
        );
        return;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={index} className="mt-6 mb-3 text-lg font-bold text-white">
            {line.slice(2)}
          </h2>,
        );
        return;
      }

      // Lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-4 text-gray-300">
            {line.slice(2)}
          </li>,
        );
        return;
      }

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        elements.push(
          <li key={index} className="ml-4 text-gray-300 list-decimal">
            {numberedMatch[2]}
          </li>,
        );
        return;
      }

      // Regular paragraph with inline formatting (bold, code)
      if (line.trim()) {
        elements.push(
          <p key={index} className="my-2 text-gray-300 leading-relaxed">
            {parseInlineMarkdown(line)}
          </p>,
        );
      } else {
        elements.push(<div key={index} className="h-2" />);
      }
    });

    return elements;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
        <div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-detail-title"
          className="bg-navy border border-gray-800 w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-800 gap-2">
            <div className="flex-1 min-w-0">
              {/* Status and Priority */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                <StatusBadge status={item.status} showTooltip={true} />
                <div className="flex items-center gap-2">
                  <PriorityDots value={item.impact_score} variant="priority" />
                  <span className="text-sm text-gray-400">
                    {getPriorityLabel()}
                  </span>
                </div>
                <QuickWinBadge
                  impactScore={item.impact_score}
                  effortScore={item.effort_score}
                />
                {/* Risk Badge - shown if analysis exists */}
                {item.risk_score !== null && (
                  <RiskBadge score={item.risk_score} size="sm" />
                )}
              </div>

              {/* Title */}
              <h2
                id="item-detail-title"
                className="text-lg sm:text-xl font-semibold text-white mb-3"
              >
                {item.title}
              </h2>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <TypeBadge type={item.type} size="md" />
                <span className="px-3 py-1 text-sm bg-gray-800 text-gray-300">
                  {item.area === 'frontend' ? 'Frontend' : 'Backend'}
                </span>
                <div className="flex items-center gap-2">
                  <PriorityDots
                    value={item.effort_score}
                    variant="effort"
                    showLabel
                  />
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scores Bar */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800 bg-black/20">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Impact
              </span>
              <span className="ml-2 text-lg font-bold text-white">
                {item.impact_score}/10
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Effort
              </span>
              <span className="ml-2 text-lg font-bold text-white">
                {item.effort_score}/10
              </span>
            </div>

            {/* View Mode Tabs */}
            <div className="flex-1 flex justify-end mt-2 sm:mt-0">
              <div className="flex items-center gap-0.5 sm:gap-1 bg-black/30 rounded p-1">
                <button
                  onClick={() => setViewMode('details')}
                  className={clsx(
                    'px-2 sm:px-3 py-1 text-xs rounded transition-colors',
                    viewMode === 'details'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white',
                  )}
                >
                  Details
                </button>
                <button
                  onClick={() => setViewMode('prd')}
                  disabled={!item.prd_content}
                  className={clsx(
                    'px-2 sm:px-3 py-1 text-xs rounded transition-colors',
                    viewMode === 'prd'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white',
                    !item.prd_content && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  PRD
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={clsx(
                    'px-2 sm:px-3 py-1 text-xs rounded transition-colors flex items-center gap-1',
                    viewMode === 'timeline'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white',
                  )}
                >
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">History</span>
                </button>
                <button
                  onClick={() => setViewMode('risk')}
                  className={clsx(
                    'px-2 sm:px-3 py-1 text-xs rounded transition-colors flex items-center gap-1',
                    viewMode === 'risk'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white',
                  )}
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span className="hidden sm:inline">Risk</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {viewMode === 'prd' && item.prd_content ? (
              <div className="prose prose-invert prose-sm max-w-none">
                {renderPrdContent(item.prd_content)}
              </div>
            ) : viewMode === 'timeline' ? (
              <ItemTimeline
                createdAt={item.created_at}
                updatedAt={item.updated_at}
                currentStatus={item.status}
                prdGeneratedAt={item.prd_content ? item.updated_at : undefined}
              />
            ) : viewMode === 'risk' ? (
              <>
                {analysisError && (
                  <div className="p-3 bg-red-400/10 border border-red-400/30 text-red-400 text-sm">
                    {analysisError}
                  </div>
                )}
                <RiskAnalysisView
                  analysis={riskAnalysis}
                  isLoading={isAnalyzing}
                  onAnalyze={handleAnalyzeRisk}
                  analyzedAt={item.risk_analyzed_at}
                />
              </>
            ) : (
              <>
                {/* High Risk Warning - show in details view if risk is high */}
                {item.risk_score !== null && item.risk_score >= 7 && (
                  <div className="p-4 bg-orange-400/10 border border-orange-400/30 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-400 font-medium">
                        High Risk Item
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        This item has a risk score of {item.risk_score}/10.
                        Review the Risk tab before approving.
                      </p>
                      <button
                        onClick={() => setViewMode('risk')}
                        className="text-sm text-gold hover:underline mt-2"
                      >
                        View Risk Analysis
                      </button>
                    </div>
                  </div>
                )}

                {/* Problem */}
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Problem
                  </h3>
                  <div className="p-4 bg-black/30 border border-gray-800">
                    <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {item.problem}
                    </p>
                  </div>
                </div>

                {/* Solution */}
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Solution
                  </h3>
                  <div className="p-4 bg-black/30 border border-gray-800">
                    <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {item.solution}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                {item.benefits && item.benefits.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                      Benefits
                    </h3>
                    <BenefitsGrid benefits={item.benefits} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 border-t border-gray-800 bg-black/20">
            {/* Left: View PRD Button */}
            <button
              onClick={
                item.prd_content ? () => setViewMode('prd') : handleGeneratePrd
              }
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:bg-white/5 disabled:opacity-50"
              title={item.prd_content ? '' : 'Press G to generate'}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isGenerating
                  ? 'Generating...'
                  : item.prd_content
                    ? 'View PRD'
                    : 'Generate PRD'}
              </span>
              <span className="sm:hidden">{isGenerating ? '...' : 'PRD'}</span>
            </button>

            {/* Right: Reject and Approve buttons */}
            {item.status === 'new' && (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Reject Button */}
                <button
                  onClick={() => handleStatusChange('rejected')}
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm border border-red-600/50 text-red-400 hover:bg-red-600/10 disabled:opacity-50"
                  title="Press X to reject"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Reject</span>
                </button>

                {/* Approve Button */}
                <button
                  onClick={handleApproveAndGeneratePrd}
                  disabled={isUpdating || isGenerating}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm bg-gold text-navy font-medium hover:opacity-90 disabled:opacity-50"
                  title="Press A to approve"
                >
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {isUpdating || isGenerating ? 'Working...' : 'Approve'}
                  </span>
                  <span className="sm:hidden">
                    {isUpdating || isGenerating ? '...' : 'Approve'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Keyboard hints - hidden on mobile */}
          <div className="hidden sm:block px-4 py-2 border-t border-gray-800 bg-black/30 text-xs text-gray-400 text-center">
            Keyboard: <kbd className="px-1 py-0.5 bg-gray-800 rounded">Esc</kbd>{' '}
            close
            {item.status === 'new' && (
              <>
                {' • '}
                <kbd className="px-1 py-0.5 bg-gray-800 rounded">A</kbd> approve
                {' • '}
                <kbd className="px-1 py-0.5 bg-gray-800 rounded">X</kbd> reject
              </>
            )}
            {!item.prd_content && (
              <>
                {' • '}
                <kbd className="px-1 py-0.5 bg-gray-800 rounded">G</kbd>{' '}
                generate PRD
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccess}
        type="checkmark"
        message={successMessage}
        onComplete={() => setShowSuccess(false)}
      />
    </>
  );
}
