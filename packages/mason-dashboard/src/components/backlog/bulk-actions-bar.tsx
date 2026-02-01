'use client';

import {
  Check,
  X,
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';

import type { BacklogItem } from '@/types/backlog';

interface BulkActionsBarProps {
  selectedItems: BacklogItem[];
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
  onRestore: (ids: string[]) => void;
  onComplete: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onClearSelection: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRestoring: boolean;
  isCompleting: boolean;
  isDeleting: boolean;
}

export function BulkActionsBar({
  selectedItems,
  onApprove,
  onReject,
  onRestore,
  onComplete,
  onDelete,
  onClearSelection,
  isApproving,
  isRejecting,
  isRestoring,
  isCompleting,
  isDeleting,
}: BulkActionsBarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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
    isApproving || isRejecting || isRestoring || isCompleting || isDeleting;

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
    <div className="fixed left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] fixed-bottom-safe md:fixed-bottom-safe-md gpu-accelerated">
      <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-black border border-gray-700 shadow-2xl">
        {/* Selection Count */}
        <div className="flex items-center gap-1.5 md:gap-2 pr-3 md:pr-4 border-r border-gray-700">
          <span className="text-white font-semibold">{count}</span>
          <span className="text-gray-400 text-sm md:text-base">
            <span className="hidden sm:inline">
              item{count !== 1 ? 's' : ''}{' '}
            </span>
            selected
          </span>
        </div>

        {/* Primary Actions - Always Visible */}
        {/* Approve Button */}
        <button
          onClick={() => onApprove(itemsNeedingApproval.map((item) => item.id))}
          disabled={isAnyLoading || itemsNeedingApproval.length === 0}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 font-medium hover:bg-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <span className="hidden sm:inline">Approve</span>
          {itemsNeedingApproval.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400">
              {itemsNeedingApproval.length}
            </span>
          )}
        </button>

        {/* Reject Button */}
        <button
          onClick={() => onReject(itemsNeedingApproval.map((item) => item.id))}
          disabled={isAnyLoading || itemsNeedingApproval.length === 0}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <span className="hidden sm:inline">Reject</span>
          {itemsNeedingApproval.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400">
              {itemsNeedingApproval.length}
            </span>
          )}
        </button>

        {/* Secondary Actions - Hidden on mobile, visible md+ */}
        <div className="hidden md:flex items-center gap-2">
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

          {/* Restore to New Button */}
          <button
            onClick={() =>
              onRestore(itemsNeedingRestore.map((item) => item.id))
            }
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

          {/* Delete Button - works on ALL items regardless of status */}
          <button
            onClick={() => onDelete(selectedItems.map((item) => item.id))}
            disabled={isAnyLoading || count === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 font-medium hover:bg-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Permanently delete ${count} item${count !== 1 ? 's' : ''}`}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete</span>
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-600/30 text-red-400">
              {count}
            </span>
          </button>
        </div>

        {/* More Menu - Visible on mobile only */}
        <div className="relative md:hidden">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            disabled={isAnyLoading}
            className="flex items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all disabled:opacity-50"
            title="More actions"
            aria-label="More actions"
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showMoreMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-black border border-gray-700 rounded-lg py-1 min-w-[160px] sm:min-w-[180px] shadow-xl">
              {/* Export PRDs */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-gray-300 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  handleExportPrds();
                  setShowMoreMenu(false);
                }}
                disabled={isAnyLoading || itemsWithPrd.length === 0}
              >
                <Download className="w-4 h-4" />
                <span>Export PRDs</span>
                {itemsWithPrd.length > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs bg-gray-600 text-gray-200">
                    {itemsWithPrd.length}
                  </span>
                )}
              </button>

              {/* Restore */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-blue-400 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  onRestore(itemsNeedingRestore.map((item) => item.id));
                  setShowMoreMenu(false);
                }}
                disabled={isAnyLoading || itemsNeedingRestore.length === 0}
              >
                {isRestoring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>Restore to New</span>
                {itemsNeedingRestore.length > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400">
                    {itemsNeedingRestore.length}
                  </span>
                )}
              </button>

              {/* Mark Completed */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-emerald-400 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  onComplete(itemsCanComplete.map((item) => item.id));
                  setShowMoreMenu(false);
                }}
                disabled={isAnyLoading || itemsCanComplete.length === 0}
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Mark Completed</span>
                {itemsCanComplete.length > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400">
                    {itemsCanComplete.length}
                  </span>
                )}
              </button>

              {/* Divider */}
              <div className="border-t border-gray-700 my-1" />

              {/* Delete */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-400 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  onDelete(selectedItems.map((item) => item.id));
                  setShowMoreMenu(false);
                }}
                disabled={isAnyLoading || count === 0}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete</span>
                <span className="ml-auto px-1.5 py-0.5 text-xs bg-red-600/30 text-red-400">
                  {count}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          disabled={isAnyLoading}
          className="ml-1 md:ml-2 px-2 md:px-3 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Clear selection"
        >
          <span className="hidden sm:inline">Clear</span>
          <X className="w-4 h-4 sm:hidden" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
