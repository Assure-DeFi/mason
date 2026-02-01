'use client';

import { Check, X, AlertCircle, Bot } from 'lucide-react';

interface AutopilotToastProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  onDismiss: () => void;
}

/**
 * Toast notification for autopilot events.
 * Appears in the bottom-right corner with auto-dismiss.
 */
export function AutopilotToast({
  type,
  title,
  message,
  onDismiss,
}: AutopilotToastProps) {
  const isSuccess = type === 'success';

  return (
    <div className="fixed right-6 z-50 animate-in slide-in-from-right-5 fade-in duration-300 fixed-bottom-safe gpu-accelerated">
      <div
        className={`
          px-4 py-3 shadow-lg border max-w-sm
          ${isSuccess ? 'bg-green-900/90 border-green-700' : 'bg-red-900/90 border-red-700'}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isSuccess ? (
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <p
                className={`font-medium text-sm ${isSuccess ? 'text-green-100' : 'text-red-100'}`}
              >
                {title}
              </p>
            </div>
            <p
              className={`text-sm mt-1 ${isSuccess ? 'text-green-300' : 'text-red-300'}`}
            >
              {message}
            </p>
          </div>

          <button
            onClick={onDismiss}
            className={`
              flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors
              ${isSuccess ? 'text-green-400' : 'text-red-400'}
            `}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AutopilotToast;
