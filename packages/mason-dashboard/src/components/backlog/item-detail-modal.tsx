'use client';

import { useState, useEffect } from 'react';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';
import {
  X,
  FileText,
  Check,
  Sparkles,
  Clock,
  ChevronRight,
  TrendingUp,
  Zap,
  AlertCircle,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
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
  initialViewMode?: ViewMode;
}

const STATUS_CONFIG: Record<
  BacklogStatus,
  { label: string; className: string; dotColor: string }
> = {
  new: {
    label: 'New',
    className: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    dotColor: 'bg-cyan-400',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-500/10 text-green-300 border-green-500/30',
    dotColor: 'bg-green-400',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    dotColor: 'bg-yellow-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/10 text-green-300 border-green-500/30',
    dotColor: 'bg-green-400',
  },
  deferred: {
    label: 'Deferred',
    className: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
    dotColor: 'bg-gray-400',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-300 border-red-500/30',
    dotColor: 'bg-red-400',
  },
};

type ViewMode = 'details' | 'prd' | 'timeline';

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
  const [error, setError] = useState<string | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    setError(null);
    try {
      await onGeneratePrd(item.id);
      setViewMode('prd');
      setSuccessMessage('PRD Generated!');
      setShowSuccess(true);
    } catch (err) {
      console.error('PRD generation error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate PRD. Please try again.',
      );
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

  const handleApproveAndGeneratePrd = async () => {
    setIsUpdating(true);
    setError(null);
    const hasPrd = !!item.prd_content;
    if (!hasPrd) {
      setIsGenerating(true);
    }
    try {
      await onUpdateStatus(item.id, 'approved');
      if (!hasPrd) {
        await onGeneratePrd(item.id);
        setViewMode('prd');
        setSuccessMessage('Approved & PRD Generated!');
      } else {
        setSuccessMessage('Approved!');
      }
      setShowSuccess(true);
    } catch (err) {
      console.error('Approve & PRD generation error:', err);
      setError(
        err instanceof Error
          ? err.message
          : hasPrd
            ? 'Failed to approve. Please try again.'
            : 'Failed to approve or generate PRD. Please try again.',
      );
    } finally {
      setIsUpdating(false);
      setIsGenerating(false);
    }
  };

  const statusConfig = STATUS_CONFIG[item.status];

  const getPriorityLabel = () => {
    if (item.impact_score >= 9) return 'Critical Priority';
    if (item.impact_score >= 7) return 'High Priority';
    if (item.impact_score >= 5) return 'Medium Priority';
    return 'Low Priority';
  };

  const renderPrdContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${index}`}
              className="my-4 p-4 bg-black/50 rounded border border-gray-800 overflow-x-auto font-mono text-sm text-gray-300"
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

      if (line.startsWith('### ')) {
        elements.push(
          <h4
            key={index}
            className="mt-6 mb-3 text-base font-semibold text-white"
          >
            {line.slice(4)}
          </h4>,
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={index} className="mt-8 mb-4 text-lg font-bold text-white">
            {line.slice(3)}
          </h3>,
        );
        return;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={index} className="mt-10 mb-5 text-xl font-bold text-gold">
            {line.slice(2)}
          </h2>,
        );
        return;
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-6 text-gray-300 leading-relaxed">
            {line.slice(2)}
          </li>,
        );
        return;
      }

      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        elements.push(
          <li
            key={index}
            className="ml-6 text-gray-300 list-decimal leading-relaxed"
          >
            {numberedMatch[2]}
          </li>,
        );
        return;
      }

      let processedLine = line.replace(
        /\*\*(.+?)\*\*/g,
        '<strong class="font-semibold text-white">$1</strong>',
      );
      processedLine = processedLine.replace(
        /`([^`]+)`/g,
        '<code class="px-1.5 py-0.5 bg-gold/20 text-gold font-mono text-sm">$1</code>',
      );

      if (line.trim()) {
        elements.push(
          <p
            key={index}
            className="my-3 text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />,
        );
      } else {
        elements.push(<div key={index} className="h-3" />);
      }
    });

    return elements;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div
          className="flex items-center justify-center min-h-screen p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-navy border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Elegant Header */}
            <div className="relative border-b border-gray-800/50 bg-gradient-to-b from-black/40 to-transparent">
              <div className="p-8">
                {/* Status Badge & Metadata Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${statusConfig.dotColor} animate-pulse`}
                      />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="w-px h-4 bg-gray-700" />
                    <TypeBadge type={item.type} size="md" />
                    <QuickWinBadge
                      impactScore={item.impact_score}
                      effortScore={item.effort_score}
                    />
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Close (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white leading-tight mb-4">
                  {item.title}
                </h2>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-black/30 border border-gray-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-gold" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Impact
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">
                        {item.impact_score}
                      </span>
                      <span className="text-sm text-gray-500">/10</span>
                    </div>
                    <div className="mt-2">
                      <PriorityDots
                        value={item.impact_score}
                        variant="priority"
                      />
                    </div>
                  </div>

                  <div className="bg-black/30 border border-gray-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Effort
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">
                        {item.effort_score}
                      </span>
                      <span className="text-sm text-gray-500">/10</span>
                    </div>
                    <div className="mt-2">
                      <PriorityDots
                        value={item.effort_score}
                        variant="effort"
                      />
                    </div>
                  </div>

                  <div className="bg-black/30 border border-gray-800 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Priority
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gold">
                        {item.priority_score}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {getPriorityLabel()}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="px-8 pb-4">
                <div className="flex items-center gap-2 border-b border-gray-800">
                  <button
                    onClick={() => setViewMode('details')}
                    className={clsx(
                      'px-4 py-3 text-sm font-medium transition-all relative',
                      viewMode === 'details'
                        ? 'text-gold'
                        : 'text-gray-400 hover:text-white',
                    )}
                  >
                    Details
                    {viewMode === 'details' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode('prd')}
                    disabled={!item.prd_content}
                    className={clsx(
                      'px-4 py-3 text-sm font-medium transition-all relative flex items-center gap-2',
                      viewMode === 'prd'
                        ? 'text-gold'
                        : 'text-gray-400 hover:text-white',
                      !item.prd_content && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    PRD
                    {viewMode === 'prd' && item.prd_content && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={clsx(
                      'px-4 py-3 text-sm font-medium transition-all relative flex items-center gap-2',
                      viewMode === 'timeline'
                        ? 'text-gold'
                        : 'text-gray-400 hover:text-white',
                    )}
                  >
                    <Clock className="w-4 h-4" />
                    History
                    {viewMode === 'timeline' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-black/10">
              {viewMode === 'prd' && item.prd_content ? (
                <div className="prose prose-invert max-w-none">
                  {renderPrdContent(item.prd_content)}
                </div>
              ) : viewMode === 'timeline' ? (
                <ItemTimeline
                  createdAt={item.created_at}
                  updatedAt={item.updated_at}
                  currentStatus={item.status}
                  prdGeneratedAt={
                    item.prd_content ? item.updated_at : undefined
                  }
                />
              ) : (
                <div className="space-y-8">
                  {/* Problem Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-6 bg-red-500/50" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                        Problem
                      </h3>
                    </div>
                    <div className="pl-4 border-l-2 border-gray-800">
                      <p className="text-gray-300 leading-relaxed text-base">
                        {item.problem}
                      </p>
                    </div>
                  </div>

                  {/* Solution Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-6 bg-green-500/50" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                        Proposed Solution
                      </h3>
                    </div>
                    <div className="pl-4 border-l-2 border-gray-800">
                      <p className="text-gray-300 leading-relaxed text-base">
                        {item.solution}
                      </p>
                    </div>
                  </div>

                  {/* Benefits Section */}
                  {item.benefits && item.benefits.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-gold" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                          Expected Benefits
                        </h3>
                      </div>
                      <BenefitsGrid benefits={item.benefits} />
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-6 border-t border-gray-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Area:</span>
                        <span className="ml-2 text-white font-medium">
                          {item.area === 'frontend' ? 'Frontend' : 'Backend'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Complexity:</span>
                        <span className="ml-2 text-white font-medium">
                          {item.complexity}/5
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security CTA - show for auth-related items */}
            {item.type === 'auth' && (
              <div className="px-8 py-4 border-t border-gray-800/50 bg-black/20">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-400">
                    <span className="font-semibold text-gray-300">
                      Need a comprehensive security audit?
                    </span>
                    <span className="ml-2">
                      2,000+ projects secured since 2021.
                    </span>
                  </div>
                  <a
                    href="https://assuredefi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-gold hover:text-gold/80 transition-colors font-medium"
                  >
                    Learn More
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="px-6 py-4 border-t border-red-800/50 bg-red-900/20">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    {error.includes('AI_KEY_NOT_CONFIGURED') ? (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-red-300">
                          No AI provider configured.
                        </p>
                        <Link
                          href="/settings/ai-providers"
                          className="flex items-center gap-1 text-sm text-gold hover:text-gold/80 font-medium"
                          onClick={onClose}
                        >
                          <Settings className="w-4 h-4" />
                          Configure AI Provider
                        </Link>
                      </div>
                    ) : error.includes('AI_KEY_INVALID') ? (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-red-300">
                          AI provider key is invalid.
                        </p>
                        <Link
                          href="/settings/ai-providers"
                          className="flex items-center gap-1 text-sm text-gold hover:text-gold/80 font-medium"
                          onClick={onClose}
                        >
                          <Settings className="w-4 h-4" />
                          Update API Key
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-red-300">{error}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    aria-label="Dismiss error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="border-t border-gray-800/50 bg-gradient-to-t from-black/40 to-transparent">
              <div className="flex items-center justify-between gap-4 p-6">
                {/* Left Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={
                      item.prd_content
                        ? () => setViewMode('prd')
                        : handleGeneratePrd
                    }
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm border border-gray-700 text-gray-300 hover:bg-white/5 hover:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    title={item.prd_content ? '' : 'Press G to generate'}
                  >
                    <FileText className="w-4 h-4" />
                    {isGenerating
                      ? 'Generating...'
                      : item.prd_content
                        ? 'View PRD'
                        : 'Generate PRD'}
                  </button>

                  {item.status === 'new' && (
                    <button
                      onClick={() => handleStatusChange('rejected')}
                      disabled={isUpdating}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm border border-red-600/30 text-red-400 hover:bg-red-600/10 hover:border-red-600/50 transition-all disabled:opacity-50 font-medium"
                      title="Press X to reject"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  )}
                </div>

                {/* Right Actions */}
                {item.status === 'new' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleStatusChange('approved')}
                      disabled={isUpdating || isGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm border border-green-600/30 text-green-400 hover:bg-green-600/10 hover:border-green-600/50 transition-all disabled:opacity-50 font-medium"
                      title="Press A to approve"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>

                    <button
                      onClick={() => handleStatusChange('approved')}
                      disabled={isUpdating}
                      className="flex items-center gap-2 px-6 py-2.5 text-sm bg-gold text-navy font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      {isUpdating ? 'Approving...' : 'Approve'}
                    </button>
                  </div>
                )}
              </div>

              {/* Keyboard hints */}
              <div className="px-6 pb-4 text-xs text-gray-500 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-gray-800 text-gray-400 rounded font-mono">
                    Esc
                  </kbd>
                  <span>close</span>
                </div>
                {item.status === 'new' && (
                  <>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-gray-800 text-gray-400 rounded font-mono">
                        A
                      </kbd>
                      <span>approve</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-gray-800 text-gray-400 rounded font-mono">
                        X
                      </kbd>
                      <span>reject</span>
                    </div>
                  </>
                )}
                {!item.prd_content && (
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-gray-800 text-gray-400 rounded font-mono">
                      G
                    </kbd>
                    <span>generate PRD</span>
                  </div>
                )}
              </div>
            </div>
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
