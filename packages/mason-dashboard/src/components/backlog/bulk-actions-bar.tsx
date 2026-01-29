'use client';

import {
  Check,
  X,
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

import type { BacklogItem } from '@/types/backlog';

interface BulkActionsBarProps {
  selectedItems: BacklogItem[];
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
  onRestore: (ids: string[]) => void;
  onComplete: (ids: string[]) => void;
  onClearSelection: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRestoring: boolean;
  isCompleting: boolean;
}

export function BulkActionsBar({
  selectedItems,
  onApprove,
  onReject,
  onRestore,
  onComplete,
  onClearSelection,
  isApproving,
  isRejecting,
  isRestoring,
  isCompleting,
}: BulkActionsBarProps) {
  const count = selectedItems.length;
  const itemsWithPrd = selectedItems.filter((item) => item.prd_content);
  const itemsNeedingApproval = selectedItems.filter(
    (item) => item.status === 'new',
  );
  const itemsNeedingRestore = selectedItems.filter(
    (item) => item.status === 'rejected',
  );
  // Items that can be marked as completed (anything not already completed)
  const itemsCanComplete = selectedItems.filter(
    (item) => item.status !== 'completed',
  );

  const isAnyLoading =
    isApproving || isRejecting || isRestoring || isCompleting;

  const handleExportPrds = () => {
    if (itemsWithPrd.length === 0) {
      return;
    }

    const markdown = itemsWithPrd
      .map((item) => {
        const header = `# ${item.title}

**Type:** ${item.type}
**Area:** ${item.area}
**Priority Score:** ${item.priority_score}
**Impact Score:** ${item.impact_score}/10
**Effort Score:** ${item.effort_score}/10
**Complexity:** ${item.complexity}/5
**Status:** ${item.status}

---

${item.prd_content}

---
`;
        return header;
      })
      .join('\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mason-prds-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-6 py-4 bg-black border border-gray-700 shadow-2xl">
        {/* Selection Count */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
          <span className="text-white font-semibold">{count}</span>
          <span className="text-gray-400">
            item{count !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Export PRDs Button */}
        <button
          onClick={handleExportPrds}
          disabled={isAnyLoading || itemsWithPrd.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700/30 border border-gray-600 text-gray-300 font-medium hover:bg-gray-700/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            itemsWithPrd.length === 0
              ? 'No PRDs to export'
              : `Export ${itemsWithPrd.length} PRD${itemsWithPrd.length !== 1 ? 's' : ''} to Markdown`
          }
        >
          <Download className="w-4 h-4" />
          <span>Export PRDs</span>
          {itemsWithPrd.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-600 text-gray-200">
              {itemsWithPrd.length}
            </span>
          )}
        </button>

        {/* Approve Button */}
        <button
          onClick={() => onApprove(itemsNeedingApproval.map((item) => item.id))}
          disabled={isAnyLoading || itemsNeedingApproval.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 font-medium hover:bg-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            itemsNeedingApproval.length === 0
              ? 'No new items to approve'
              : `Approve ${itemsNeedingApproval.length} item${itemsNeedingApproval.length !== 1 ? 's' : ''}`
          }
        >
          {isApproving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>Approve</span>
          {itemsNeedingApproval.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400">
              {itemsNeedingApproval.length}
            </span>
          )}
        </button>

        {/* Reject Button */}
        <button
          onClick={() => onReject(itemsNeedingApproval.map((item) => item.id))}
          disabled={isAnyLoading || itemsNeedingApproval.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            itemsNeedingApproval.length === 0
              ? 'No new items to reject'
              : `Reject ${itemsNeedingApproval.length} item${itemsNeedingApproval.length !== 1 ? 's' : ''}`
          }
        >
          {isRejecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span>Reject</span>
          {itemsNeedingApproval.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400">
              {itemsNeedingApproval.length}
            </span>
          )}
        </button>

        {/* Restore to New Button */}
        <button
          onClick={() => onRestore(itemsNeedingRestore.map((item) => item.id))}
          disabled={isAnyLoading || itemsNeedingRestore.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-medium hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            itemsNeedingRestore.length === 0
              ? 'No rejected items to restore'
              : `Restore ${itemsNeedingRestore.length} item${itemsNeedingRestore.length !== 1 ? 's' : ''} to New`
          }
        >
          {isRestoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          <span>Restore to New</span>
          {itemsNeedingRestore.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400">
              {itemsNeedingRestore.length}
            </span>
          )}
        </button>

        {/* Mark Completed Button */}
        <button
          onClick={() => onComplete(itemsCanComplete.map((item) => item.id))}
          disabled={isAnyLoading || itemsCanComplete.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            itemsCanComplete.length === 0
              ? 'All items already completed'
              : `Mark ${itemsCanComplete.length} item${itemsCanComplete.length !== 1 ? 's' : ''} as completed`
          }
        >
          {isCompleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>Mark Completed</span>
          {itemsCanComplete.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400">
              {itemsCanComplete.length}
            </span>
          )}
        </button>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          disabled={isAnyLoading}
          className="ml-2 px-3 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
