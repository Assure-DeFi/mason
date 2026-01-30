'use client';

import { useState, useCallback } from 'react';

interface UseCopyToClipboardOptions {
  /** Duration in ms to show "copied" state (default: 2000) */
  copiedDuration?: number;
  /** Duration in ms to show "error" state (default: 3000) */
  errorDuration?: number;
  /** Callback when copy succeeds */
  onSuccess?: () => void;
  /** Callback when copy fails */
  onError?: (error: Error) => void;
}

interface UseCopyToClipboardReturn {
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Whether text was recently copied */
  copied: boolean;
  /** Whether copy operation failed */
  error: boolean;
  /** Reset the copied/error state */
  reset: () => void;
}

/**
 * Custom hook for clipboard copy functionality.
 *
 * Centralizes clipboard write logic with standardized error handling,
 * state management (copied flag, error state), and auto-reset timeouts.
 *
 * @example
 * ```tsx
 * const { copy, copied, error } = useCopyToClipboard();
 *
 * <button onClick={() => copy(apiKey)}>
 *   {copied ? 'Copied!' : error ? 'Failed' : 'Copy'}
 * </button>
 * ```
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
  const {
    copiedDuration = 2000,
    errorDuration = 3000,
    onSuccess,
    onError,
  } = options;

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const reset = useCallback(() => {
    setCopied(false);
    setError(false);
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setError(false);
        onSuccess?.();

        // Auto-reset copied state
        setTimeout(() => setCopied(false), copiedDuration);
        return true;
      } catch (err) {
        const copyError =
          err instanceof Error ? err : new Error('Failed to copy to clipboard');
        console.error('Clipboard copy failed:', copyError);
        setError(true);
        setCopied(false);
        onError?.(copyError);

        // Auto-reset error state
        setTimeout(() => setError(false), errorDuration);
        return false;
      }
    },
    [copiedDuration, errorDuration, onSuccess, onError],
  );

  return { copy, copied, error, reset };
}

export default useCopyToClipboard;
