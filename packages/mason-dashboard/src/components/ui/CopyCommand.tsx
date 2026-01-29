'use client';

import { clsx } from 'clsx';
import { Copy, Check, AlertCircle, X, Terminal } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';

interface CopyCommandProps {
  /** Command to copy */
  command: string;
  /** Label text above the command */
  label?: string;
  /** Description text below the command */
  description?: string;
  /** Show a large persistent toast after copying */
  showPersistentToast?: boolean;
  /** Auto-copy on mount */
  autoCopy?: boolean;
  /** Callback when copy succeeds */
  onCopy?: () => void;
  /** Callback when user confirms they pasted */
  onConfirmPasted?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

export function CopyCommand({
  command,
  label,
  description,
  showPersistentToast = true,
  autoCopy = false,
  onCopy,
  onConfirmPasted,
  size = 'md',
  className,
}: CopyCommandProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setCopyError(false);
      onCopy?.();

      if (showPersistentToast) {
        setShowToast(true);
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  }, [command, onCopy, showPersistentToast]);

  // Auto-copy on mount if enabled
  useEffect(() => {
    if (autoCopy) {
      const timer = setTimeout(() => void handleCopy(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoCopy, handleCopy]);

  const handleConfirmPasted = () => {
    setShowToast(false);
    onConfirmPasted?.();
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-4 text-base',
  };

  return (
    <>
      <div className={clsx('space-y-2', className)}>
        {label && <p className="text-sm font-medium text-gray-300">{label}</p>}

        <div
          className={clsx(
            'relative flex items-center gap-3 rounded-lg border bg-black/50 font-mono group cursor-pointer transition-all',
            copyError
              ? 'border-red-600 bg-red-900/20'
              : copied
                ? 'border-green-600 bg-green-900/20'
                : 'border-gray-700 hover:border-gold/50',
            sizeClasses[size],
          )}
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              void handleCopy();
            }
          }}
          aria-label={`Copy command: ${command}`}
        >
          <Terminal className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <code className="flex-1 text-gold overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-700">
            {command}
          </code>
          <div className="flex-shrink-0 flex items-center gap-2">
            {copyError ? (
              <span className="flex items-center gap-1 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4" />
                Failed
              </span>
            ) : copied ? (
              <span className="flex items-center gap-1 text-green-400 text-xs">
                <Check className="w-4 h-4" />
                Copied!
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400 group-hover:text-gold text-xs transition-colors">
                <Copy className="w-4 h-4" />
                Click to copy
              </span>
            )}
          </div>
        </div>

        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>

      {/* Persistent Toast */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4 animate-[slideUp_0.3s_ease-out]">
          <div className="bg-green-600 text-white rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Command copied to clipboard!</p>
                  <p className="text-sm text-white/80 mt-0.5">
                    Paste this in your terminal now.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowToast(false)}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {onConfirmPasted && (
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={handleConfirmPasted}
                  className="flex-1 px-4 py-2 bg-white text-green-700 font-semibold rounded hover:bg-white/90 transition-colors"
                >
                  I pasted it
                </button>
                <button
                  onClick={() => setShowToast(false)}
                  className="px-4 py-2 text-white/80 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default CopyCommand;
