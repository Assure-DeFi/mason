'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';
import { X, FileText, Check, Sparkles, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { TypeBadge } from './type-badge';
import { PriorityDots } from './priority-dots';
import { BenefitsGrid } from './benefits-grid';
import { QuickWinBadge } from './QuickWinBadge';
import { ItemTimeline } from './ItemTimeline';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';

interface ItemDetailModalProps {
  item: BacklogItem;
  onClose: () => void;
  onUpdateStatus: (id: string, status: BacklogStatus) => Promise<void>;
  onGeneratePrd: (id: string) => Promise<void>;
}

const STATUS_CONFIG: Record<
  BacklogStatus,
  { label: string; className: string }
> = {
  new: {
    label: 'New',
    className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
  },
  deferred: {
    label: 'Deferred',
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
};

type ViewMode = 'details' | 'prd' | 'timeline';

export function ItemDetailModal({
  item,
  onClose,
  onUpdateStatus,
  onGeneratePrd,
}: ItemDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
            handleGeneratePrd();
          }
          break;
        case 'a':
          if (item.status === 'new' && !isUpdating) {
            handleStatusChange('approved');
          }
          break;
        case 'x':
          if (item.status === 'new' && !isUpdating) {
            handleStatusChange('rejected');
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

  const statusConfig = STATUS_CONFIG[item.status];

  // Get priority label based on score
  const getPriorityLabel = () => {
    if (item.impact_score >= 9) return 'Critical Priority';
    if (item.impact_score >= 7) return 'High Priority';
    if (item.impact_score >= 5) return 'Medium Priority';
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

      // Bold text (basic)
      let processedLine = line.replace(
        /\*\*(.+?)\*\*/g,
        '<strong class="font-semibold text-white">$1</strong>',
      );
      // Inline code
      processedLine = processedLine.replace(
        /`([^`]+)`/g,
        '<code class="px-1 py-0.5 bg-black rounded text-gold font-mono text-sm">$1</code>',
      );

      // Regular paragraph
      if (line.trim()) {
        elements.push(
          <p
            key={index}
            className="my-2 text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />,
        );
      } else {
        elements.push(<div key={index} className="h-2" />);
      }
    });

    return elements;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-navy border border-gray-800 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-800">
            <div className="flex-1">
              {/* Status and Priority */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={clsx(
                    'px-2 py-1 text-xs border',
                    statusConfig.className,
                  )}
                >
                  {statusConfig.label}
                </span>
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
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-white mb-3">
                {item.title}
              </h2>

              {/* Tags */}
              <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-8 px-6 py-4 border-b border-gray-800 bg-black/20">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Impact
              </span>
              <span className="ml-2 text-lg font-bold text-white">
                {item.impact_score}/10
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Effort
              </span>
              <span className="ml-2 text-lg font-bold text-white">
                {item.effort_score}/10
              </span>
            </div>

            {/* View Mode Tabs */}
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-1 bg-black/30 rounded p-1">
                <button
                  onClick={() => setViewMode('details')}
                  className={clsx(
                    'px-3 py-1 text-xs rounded transition-colors',
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
                    'px-3 py-1 text-xs rounded transition-colors',
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
                    'px-3 py-1 text-xs rounded transition-colors flex items-center gap-1',
                    viewMode === 'timeline'
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white',
                  )}
                >
                  <Clock className="w-3 h-3" />
                  History
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            ) : (
              <>
                {/* Problem */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
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
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
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
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Benefits
                    </h3>
                    <BenefitsGrid benefits={item.benefits} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Security CTA - show for auth-related items */}
          {item.type === 'auth' && (
            <div className="px-6 py-4 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-400">
                  <span className="font-medium text-gray-300">
                    Need a comprehensive security audit?
                  </span>
                  <span className="ml-2">
                    2,000+ projects &amp; $2B+ secured since 2021.
                  </span>
                </div>
                <a
                  href="https://assuredefi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 transition-colors hover:text-gold"
                >
                  Learn More →
                </a>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-800 bg-black/20">
            {/* View/Generate PRD Button */}
            <button
              onClick={
                item.prd_content ? () => setViewMode('prd') : handleGeneratePrd
              }
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:bg-white/5 disabled:opacity-50"
              title={item.prd_content ? '' : 'Press G to generate'}
            >
              <FileText className="w-4 h-4" />
              {isGenerating
                ? 'Generating...'
                : item.prd_content
                  ? 'View PRD'
                  : 'Generate PRD'}
            </button>

            {/* Reject Button - only show for new items */}
            {item.status === 'new' && (
              <button
                onClick={() => handleStatusChange('rejected')}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-red-600/50 text-red-400 hover:bg-red-600/10 disabled:opacity-50"
                title="Press X to reject"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            )}

            {/* Approve Button - only show for new items */}
            {item.status === 'new' && (
              <>
                {/* Simple Approve */}
                <button
                  onClick={() => handleStatusChange('approved')}
                  disabled={isUpdating || isGenerating}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-green-600/50 text-green-400 hover:bg-green-600/10 disabled:opacity-50"
                  title="Press A to approve"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>

                {/* Approve + Generate PRD Combo */}
                <button
                  onClick={handleApproveAndGeneratePrd}
                  disabled={isUpdating || isGenerating}
                  className="flex items-center gap-2 px-6 py-2 text-sm bg-gold text-navy font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isUpdating || isGenerating
                    ? 'Working...'
                    : 'Approve & Generate PRD'}
                </button>
              </>
            )}
          </div>

          {/* Keyboard hints */}
          <div className="px-4 py-2 border-t border-gray-800 bg-black/30 text-xs text-gray-500 text-center">
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
