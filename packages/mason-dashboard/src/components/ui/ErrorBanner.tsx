'use client';

import { clsx } from 'clsx';
import {
  AlertCircle,
  X,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { getErrorConfig, type ErrorCode } from '@/lib/errors';

interface ErrorBannerProps {
  /** The error to display */
  error: unknown;
  /** Optional error code override */
  errorCode?: ErrorCode;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for dismiss */
  onDismiss?: () => void;
  /** Whether the banner is dismissible */
  dismissible?: boolean;
  /** Additional className */
  className?: string;
}

export function ErrorBanner({
  error,
  errorCode: _errorCode,
  onRetry,
  onDismiss,
  dismissible = true,
  className,
}: ErrorBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  if (isDismissed) {
    return null;
  }

  const config = getErrorConfig(error);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const severityClasses = {
    warning: 'bg-yellow-900/20 border-yellow-800/50 text-yellow-200',
    error: 'bg-red-900/20 border-red-800/50 text-red-200',
    critical: 'bg-red-900/40 border-red-700 text-red-100',
  };

  const iconClasses = {
    warning: 'text-yellow-500',
    error: 'text-red-500',
    critical: 'text-red-400',
  };

  return (
    <div
      className={clsx(
        'rounded-lg border p-4',
        severityClasses[config.severity],
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <AlertCircle
          className={clsx(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            iconClasses[config.severity],
          )}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium">{config.message}</h3>
          <p className="mt-1 text-sm opacity-80">{config.description}</p>

          {/* Actions */}
          {config.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {config.actions.map((action, index) => {
                if (action.type === 'link') {
                  return (
                    <a
                      key={index}
                      href={action.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm bg-white/10 hover:bg-white/20 rounded transition-colors touch-feedback"
                    >
                      {action.label}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  );
                }

                if (
                  action.type === 'button' &&
                  action.value === 'retry' &&
                  onRetry
                ) {
                  return (
                    <button
                      key={index}
                      onClick={onRetry}
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm bg-white/10 hover:bg-white/20 rounded transition-colors touch-feedback"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {action.label}
                    </button>
                  );
                }

                if (action.type === 'copy') {
                  return (
                    <button
                      key={index}
                      onClick={() => handleCopy(action.value)}
                      className={`inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm rounded transition-colors touch-feedback ${
                        copyError
                          ? 'bg-red-500/30 text-red-200'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                      title={copyError ? 'Copy failed' : undefined}
                    >
                      {copyError ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copyError ? 'Failed' : action.label}
                    </button>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded transition-colors touch-feedback"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline error message for forms
 */
export function InlineError({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={clsx('text-sm text-red-400 mt-1', className)}>{message}</p>
  );
}

/**
 * Error toast that appears at the bottom right
 */
export function ErrorToast({
  message,
  onDismiss,
  duration = 5000,
}: {
  message: string;
  onDismiss: () => void;
  duration?: number;
}) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed right-6 z-50 px-4 py-3 bg-red-600 text-white shadow-lg rounded flex items-center gap-3 fixed-bottom-safe gpu-accelerated">
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onDismiss();
        }}
        className="p-1 hover:bg-white/20 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ErrorBanner;
