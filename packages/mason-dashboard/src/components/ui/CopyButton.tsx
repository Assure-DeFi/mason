'use client';

import { clsx } from 'clsx';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useState, useCallback } from 'react';

interface CopyButtonProps {
  /** Text to copy to clipboard */
  text: string;
  /** Button label (optional, shows icon-only if not provided) */
  label?: string;
  /** Label to show when copied */
  copiedLabel?: string;
  /** Button variant */
  variant?: 'default' | 'primary' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show toast notification on copy */
  showToast?: boolean;
  /** Toast message */
  toastMessage?: string;
  /** Callback when copy succeeds */
  onCopy?: () => void;
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function CopyButton({
  text,
  label,
  copiedLabel = 'Copied!',
  variant = 'default',
  size = 'md',
  showToast = false,
  toastMessage = 'Copied to clipboard',
  onCopy,
  className,
  disabled = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [showToastState, setShowToastState] = useState(false);

  const handleCopy = useCallback(async () => {
    if (disabled) {return;}

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
      onCopy?.();

      if (showToast) {
        setShowToastState(true);
        setTimeout(() => setShowToastState(false), 2000);
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  }, [text, disabled, onCopy, showToast]);

  const variantClasses = {
    default:
      'border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white',
    primary: 'bg-gold text-navy font-medium hover:opacity-90',
    ghost: 'text-gray-400 hover:bg-white/5 hover:text-white',
  };

  const sizeClasses = {
    sm: label ? 'px-2 py-1 text-xs gap-1' : 'p-1.5',
    md: label ? 'px-3 py-2 text-sm gap-2' : 'p-2',
    lg: label ? 'px-4 py-2.5 text-base gap-2' : 'p-3',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center justify-center rounded transition-all',
          variantClasses[variant],
          sizeClasses[size],
          disabled && 'opacity-50 cursor-not-allowed',
          copyError && 'border-red-600 text-red-400',
          className,
        )}
        aria-label={label || 'Copy to clipboard'}
        title={
          copyError
            ? 'Copy failed - try selecting and copying manually'
            : undefined
        }
      >
        {copyError ? (
          <>
            <AlertCircle className={clsx(iconSizes[size], 'text-red-400')} />
            {label && <span className="text-red-400">Failed</span>}
          </>
        ) : copied ? (
          <>
            <Check className={clsx(iconSizes[size], 'text-green-500')} />
            {label && <span>{copiedLabel}</span>}
          </>
        ) : (
          <>
            <Copy className={iconSizes[size]} />
            {label && <span>{label}</span>}
          </>
        )}
      </button>

      {/* Toast notification */}
      {showToastState && showToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-green-600 text-white text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Inline copy button for code blocks and inline text
 */
export function InlineCopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <CopyButton text={text} variant="ghost" size="sm" className={className} />
  );
}

/**
 * Copy button styled for code blocks with "Copy" label
 */
export function CodeCopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <CopyButton
      text={text}
      label="Copy"
      copiedLabel="Copied!"
      variant="ghost"
      size="sm"
      className={clsx('text-xs', className)}
    />
  );
}

export default CopyButton;
