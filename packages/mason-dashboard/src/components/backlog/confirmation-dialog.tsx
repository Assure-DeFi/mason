'use client';

import {
  X,
  AlertTriangle,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { useFocusTrap } from '@/hooks/useFocusTrap';

interface BacklogItemForPreview {
  id: string;
  title: string;
  complexity?: number | string;
  impact_score?: number;
  effort_score?: number;
  type?: string;
  risk_score?: number | null;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemCount: number;
  itemTitles?: string[];
  confirmLabel: string;
  confirmVariant: 'approve' | 'reject' | 'danger' | 'restore' | 'complete';
  isLoading?: boolean;
  /** Optional: Pass full item data to show impact summary for bulk approvals */
  items?: BacklogItemForPreview[];
}

/**
 * Calculate aggregate impact summary for a batch of items
 */
function calculateImpactSummary(items: BacklogItemForPreview[]) {
  if (!items || items.length === 0) {
    return null;
  }

  // Total estimated effort (sum of effort scores)
  const totalEffort = items.reduce(
    (sum, item) => sum + (item.effort_score || 3),
    0,
  );

  // Total impact (sum of impact scores)
  const totalImpact = items.reduce(
    (sum, item) => sum + (item.impact_score || 5),
    0,
  );

  // Average complexity (convert string complexity to number)
  const getComplexityNum = (c: number | string | undefined): number => {
    if (typeof c === 'number') {
      return c;
    }
    if (c === 'low') {
      return 1;
    }
    if (c === 'medium') {
      return 2;
    }
    if (c === 'high') {
      return 3;
    }
    if (c === 'very_high') {
      return 4;
    }
    return 2; // default
  };
  const avgComplexity =
    items.reduce((sum, item) => sum + getComplexityNum(item.complexity), 0) /
    items.length;

  // Risk breakdown
  const riskCounts = { high: 0, medium: 0, low: 0 };
  items.forEach((item) => {
    const risk = item.risk_score || 3;
    if (risk >= 7) {
      riskCounts.high++;
    } else if (risk >= 4) {
      riskCounts.medium++;
    } else {
      riskCounts.low++;
    }
  });

  // Category distribution
  const categoryCount: Record<string, number> = {};
  items.forEach((item) => {
    const type = item.type || 'other';
    categoryCount[type] = (categoryCount[type] || 0) + 1;
  });

  return {
    totalEffort,
    totalImpact,
    avgComplexity: Math.round(avgComplexity * 10) / 10,
    riskCounts,
    categoryCount,
    itemCount: items.length,
  };
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemCount,
  itemTitles = [],
  confirmLabel,
  confirmVariant,
  isLoading = false,
  items,
}: ConfirmationDialogProps) {
  const focusTrapRef = useFocusTrap(isOpen);

  // Calculate impact summary when items are provided (for bulk approval preview)
  const impactSummary = useMemo(
    () =>
      items && confirmVariant === 'approve'
        ? calculateImpactSummary(items)
        : null,
    [items, confirmVariant],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) {
    return null;
  }

  const variantClasses = {
    approve:
      'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20',
    reject: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    restore:
      'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
    complete:
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm backdrop-blur-fallback flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="bg-navy border border-gray-800 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 id="dialog-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 mb-4">{message}</p>

          {/* Impact Summary Panel - Only shown for bulk approvals with item data */}
          {impactSummary && itemCount > 1 && (
            <div className="bg-black/40 border border-gray-700 p-4 mb-4">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" />
                Impact Summary
              </h4>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Total Effort */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Total Effort:</span>
                  <span className="text-white font-medium">
                    {impactSummary.totalEffort}
                  </span>
                </div>

                {/* Total Impact */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">Total Impact:</span>
                  <span className="text-white font-medium">
                    {impactSummary.totalImpact}
                  </span>
                </div>

                {/* Avg Complexity */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Avg Complexity:</span>
                  <span className="text-white font-medium">
                    {impactSummary.avgComplexity}/5
                  </span>
                </div>

                {/* Item Count */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Items:</span>
                  <span className="text-white font-medium">
                    {impactSummary.itemCount}
                  </span>
                </div>
              </div>

              {/* Risk Distribution */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Risk Distribution
                </span>
                <div className="flex items-center gap-4 mt-2">
                  {impactSummary.riskCounts.high > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-red-400 text-sm">
                        {impactSummary.riskCounts.high} High
                      </span>
                    </div>
                  )}
                  {impactSummary.riskCounts.medium > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-yellow-400 text-sm">
                        {impactSummary.riskCounts.medium} Med
                      </span>
                    </div>
                  )}
                  {impactSummary.riskCounts.low > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 text-sm">
                        {impactSummary.riskCounts.low} Low
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Categories
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(impactSummary.categoryCount).map(
                    ([category, count]) => (
                      <span
                        key={category}
                        className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 text-gray-300"
                      >
                        {category}: {count}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Item List */}
          <div className="bg-black/30 border border-gray-800 p-4 mb-4">
            <p className="text-sm text-gray-400 mb-2">
              <span className="font-semibold text-white">{itemCount}</span> item
              {itemCount !== 1 ? 's' : ''} will be affected:
            </p>
            {itemTitles.length > 0 && (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {itemTitles.slice(0, 5).map((itemTitle, index) => (
                  <li key={index} className="text-sm text-gray-400 truncate">
                    - {itemTitle}
                  </li>
                ))}
                {itemTitles.length > 5 && (
                  <li className="text-sm text-gray-400 italic">
                    ...and {itemTitles.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800 bg-black/20">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[confirmVariant]}`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
