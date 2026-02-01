'use client';

import { X, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { useFocusTrap } from '@/hooks/useFocusTrap';

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
}: ConfirmationDialogProps) {
  const focusTrapRef = useFocusTrap(isOpen);

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
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 mb-4">{message}</p>

          <div className="bg-black/30 border border-gray-800 p-4 mb-4">
            <p className="text-sm text-gray-400 mb-2">
              <span className="font-semibold text-white">{itemCount}</span> item
              {itemCount !== 1 ? 's' : ''} will be affected:
            </p>
            {itemTitles.length > 0 && (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {itemTitles.slice(0, 5).map((title, index) => (
                  <li key={index} className="text-sm text-gray-400 truncate">
                    • {title}
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
