'use client';

import { AlertTriangle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Content to render */
  children: ReactNode;
  /** Optional fallback UI to show instead of the default */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Section name for error reporting context */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

/**
 * ErrorBoundary - Catches React render errors and displays a fallback UI
 *
 * Must be a class component as React error boundaries require getDerivedStateFromError
 * and componentDidCatch lifecycle methods which are not available in function components.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', {
      section: this.props.section,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });

    // Call optional error callback for external error reporting
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails } = this.state;
    const { children, fallback, section } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-black/30 border border-red-900/50 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            Something went wrong
          </h3>

          <p className="text-gray-400 text-center max-w-md mb-6">
            {section
              ? `The ${section} section encountered an error and couldn't render.`
              : 'An unexpected error occurred while rendering this section.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-navy font-medium hover:bg-gold/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>

            <button
              onClick={this.toggleDetails}
              className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-300 hover:bg-white/5 transition-colors"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show Details
                </>
              )}
            </button>
          </div>

          {/* Error details (expandable) */}
          {showDetails && error && (
            <div className="mt-6 w-full max-w-2xl">
              <div className="bg-black/50 border border-gray-800 rounded-lg p-4 overflow-auto">
                <p className="text-sm font-medium text-red-400 mb-2">
                  {error.name}: {error.message}
                </p>
                {error.stack && (
                  <pre className="text-xs text-gray-500 whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                )}
                {errorInfo?.componentStack && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <p className="text-xs text-gray-400 mb-2">
                      Component Stack:
                    </p>
                    <pre className="text-xs text-gray-500 whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
