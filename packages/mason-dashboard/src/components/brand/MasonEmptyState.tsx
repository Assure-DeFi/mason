'use client';

import { clsx } from 'clsx';
import { MasonAvatar } from './MasonAvatar';
import { MasonMark } from './MasonMark';

interface MasonEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'character' | 'minimal';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Mason Empty State - Branded empty state component
 * Shows the Mason character/mark with helpful messaging
 */
export function MasonEmptyState({
  title,
  description,
  icon,
  variant = 'character',
  className,
  children,
}: MasonEmptyStateProps) {
  return (
    <div
      className={clsx(
        'mason-entrance flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
    >
      {variant === 'character' && (
        <div className="mb-6 opacity-60">
          <MasonAvatar size="xl" variant="minimal" />
        </div>
      )}
      {variant === 'minimal' && (
        <div className="mb-6 opacity-40">
          <MasonMark size="xl" />
        </div>
      )}
      {variant === 'default' && icon && (
        <div className="mb-6 text-gray-600">{icon}</div>
      )}

      <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
      {description && (
        <p className="mb-6 max-w-md text-gray-400">{description}</p>
      )}
      {children && (
        <div className="flex flex-col items-center gap-4">{children}</div>
      )}
    </div>
  );
}

/**
 * Mason Error State - Branded error state component
 */
export function MasonErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  isRetrying = false,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'mason-entrance flex flex-col items-center justify-center py-16 text-center',
        className,
      )}
    >
      <div className="mb-6 opacity-40">
        <MasonMark size="xl" variant="gold" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-red-400">{title}</h3>
      {description && (
        <p className="mb-6 max-w-md text-gray-400">{description}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  );
}

/**
 * Mason 404 State - Branded not found state
 */
export function Mason404State({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'mason-entrance flex min-h-[60vh] flex-col items-center justify-center py-16 text-center',
        className,
      )}
    >
      <div className="mb-8">
        <MasonAvatar size="2xl" variant="detailed" />
      </div>
      <h1 className="mason-wordmark mb-4 text-6xl font-bold text-gold">404</h1>
      <h2 className="mb-2 text-2xl font-semibold text-white">Page Not Found</h2>
      <p className="mb-8 max-w-md text-gray-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      {children}
    </div>
  );
}

export default MasonEmptyState;
