'use client';

import { useState } from 'react';
import type { BacklogItem, BacklogStatus } from '@/types/backlog';
import { X, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { TypeBadge } from './type-badge';
import { PriorityDots } from './priority-dots';
import { BenefitsGrid } from './benefits-grid';

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

export function ItemDetailModal({
  item,
  onClose,
  onUpdateStatus,
  onGeneratePrd,
}: ItemDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPrd, setShowPrd] = useState(false);

  const handleGeneratePrd = async () => {
    setIsGenerating(true);
    try {
      await onGeneratePrd(item.id);
      setShowPrd(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (status: BacklogStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(item.id, status);
    } finally {
      setIsUpdating(false);
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

  return (
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {showPrd && item.prd_content ? (
            <div>
              <button
                onClick={() => setShowPrd(false)}
                className="mb-4 text-sm text-gold hover:underline"
              >
                Back to Details
              </button>
              <pre className="whitespace-pre-wrap text-sm text-gray-200 bg-black/30 p-4 overflow-x-auto">
                {item.prd_content}
              </pre>
            </div>
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

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-800 bg-black/20">
          {/* View PRD Button */}
          <button
            onClick={
              item.prd_content ? () => setShowPrd(true) : handleGeneratePrd
            }
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:bg-white/5 disabled:opacity-50"
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
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          )}

          {/* Approve Button - only show for new items */}
          {item.status === 'new' && (
            <button
              onClick={() => handleStatusChange('approved')}
              disabled={isUpdating}
              className="flex items-center gap-2 px-6 py-2 text-sm bg-gold text-navy font-medium hover:bg-gold/90 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Approve'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
