'use client';

import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback component to render when error occurs */
  fallback?: ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show detailed error info (default: false in production) */
  showDetails?: boolean;
  /** Label for the error boundary context (e.g., "Backlog Page", "Modal") */
  context?: string;
}

/**
 * React Error Boundary component that catches JavaScript errors in child components.
 * Prevents entire page from crashing when a single component fails.
 *
 * Usage:
 * <ErrorBoundary context="Backlog Page">
 *   <BacklogContent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Caught error:', {
      context: this.props.context,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Store error info for display
    this.setState({ errorInfo });

    // Call optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false, context } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI matching Mason brand
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">
            Something went wrong
          </h2>

          <p className="text-gray-400 mb-6 max-w-md">
            {context
              ? `An error occurred in ${context}. `
              : 'An error occurred. '}
            You can try again or return to the home page.
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-navy font-medium rounded hover:bg-gold/90 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>

            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          </div>

          {/* Error details (development mode or when explicitly enabled) */}
          {(showDetails || process.env.NODE_ENV === 'development') && error && (
            <details className="mt-6 text-left w-full max-w-lg">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                Show error details
              </summary>
              <div className="mt-2 p-4 bg-black/50 rounded text-xs font-mono overflow-auto max-h-48">
                <p className="text-red-400 mb-2">{error.message}</p>
                {error.stack && (
                  <pre className="text-gray-500 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
                {errorInfo?.componentStack && (
                  <pre className="text-gray-600 whitespace-pre-wrap mt-2 border-t border-gray-700 pt-2">
                    Component Stack:
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap any component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  context?: string
): React.ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary context={context || displayName}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;

  return WithErrorBoundary;
}

export default ErrorBoundary;
