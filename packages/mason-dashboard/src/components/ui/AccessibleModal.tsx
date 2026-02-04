'use client';

/**
 * AccessibleModal Component
 *
 * A shared accessible modal component that provides:
 * - Focus trapping (Tab/Shift+Tab stays within modal)
 * - Focus restoration (returns focus on close)
 * - ARIA attributes (role="dialog", aria-modal, aria-labelledby)
 * - Escape key handling
 * - Backdrop click handling (optional)
 * - Background scroll lock
 *
 * Use this as a base component for all modals to ensure consistent
 * accessibility across the application.
 */

import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useCallback, useEffect, useId } from 'react';

import { useFocusTrap } from '@/hooks/useFocusTrap';

interface AccessibleModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (used for aria-labelledby) */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Optional description for screen readers */
  description?: string;
  /** Whether to close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Whether to close when clicking backdrop (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether to show the close button (default: true) */
  showCloseButton?: boolean;
  /** Custom z-index for stacking (default: 50) */
  zIndex?: number;
  /** Modal width class (default: 'max-w-lg') */
  widthClass?: string;
  /** Additional class names for the modal container */
  className?: string;
  /** Whether to render header with title (default: true) */
  showHeader?: boolean;
  /** Optional custom header actions */
  headerActions?: React.ReactNode;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  description,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  showCloseButton = true,
  zIndex = 50,
  widthClass = 'max-w-lg',
  className,
  showHeader = true,
  headerActions,
}: AccessibleModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const focusTrapRef = useFocusTrap(isOpen);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop itself, not children
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose],
  );

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Add escape key listener
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={clsx('fixed inset-0 flex items-center justify-center p-4', {
        [`z-${zIndex}`]: true,
      })}
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={clsx(
          'relative w-full rounded-xl border border-gray-800 bg-navy shadow-2xl',
          'max-h-[90vh] overflow-hidden',
          widthClass,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
            <h2
              id={titleId}
              className="text-lg font-semibold text-white"
            >
              {title}
            </h2>
            <div className="flex items-center gap-2">
              {headerActions}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Description (hidden but announced to screen readers) */}
        {description && (
          <div id={descriptionId} className="sr-only">
            {description}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * AccessibleModalContent - Wrapper for modal body content
 * Provides consistent padding
 */
export function AccessibleModalContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('px-6 py-4', className)}>
      {children}
    </div>
  );
}

/**
 * AccessibleModalFooter - Wrapper for modal footer/actions
 * Provides consistent styling for action buttons
 */
export function AccessibleModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
