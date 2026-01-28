'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface SuccessAnimationProps {
  /** Show the animation */
  show: boolean;
  /** Animation type */
  type?: 'checkmark' | 'confetti';
  /** Message to display */
  message?: string;
  /** Duration before auto-hide (ms) */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Success animation with checkmark expand effect
 * Respects prefers-reduced-motion
 */
export function SuccessAnimation({
  show,
  type = 'checkmark',
  message,
  duration = 2000,
  onComplete,
  size = 'md',
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Handle visibility and auto-hide
  useEffect(() => {
    if (show) {
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!isVisible) return null;

  const sizeClasses = {
    sm: { container: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-sm' },
    md: { container: 'w-16 h-16', icon: 'w-8 h-8', text: 'text-base' },
    lg: { container: 'w-24 h-24', icon: 'w-12 h-12', text: 'text-lg' },
  };

  const sizes = sizeClasses[size];

  if (type === 'checkmark') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className={clsx(
            'flex flex-col items-center gap-3',
            !prefersReducedMotion && 'animate-success-fade-in',
          )}
        >
          {/* Expanding circle with checkmark */}
          <div
            className={clsx(
              'rounded-full bg-green-500/20 flex items-center justify-center',
              sizes.container,
              !prefersReducedMotion && 'animate-success-scale',
            )}
          >
            <div
              className={clsx(
                'rounded-full bg-green-500 flex items-center justify-center p-2',
                !prefersReducedMotion && 'animate-success-check',
              )}
            >
              <Check
                className={clsx(sizes.icon, 'text-white')}
                strokeWidth={3}
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <p
              className={clsx(
                'text-white font-medium',
                sizes.text,
                !prefersReducedMotion && 'animate-success-fade-in-delayed',
              )}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Confetti animation (simplified - actual confetti would need a library)
  if (type === 'confetti') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className={clsx(
            'flex flex-col items-center gap-3',
            !prefersReducedMotion && 'animate-success-fade-in',
          )}
        >
          {/* Success checkmark */}
          <div
            className={clsx(
              'rounded-full bg-gold/20 flex items-center justify-center',
              sizes.container,
              !prefersReducedMotion && 'animate-success-scale',
            )}
          >
            <div className="rounded-full bg-gold flex items-center justify-center p-2">
              <Check
                className={clsx(sizes.icon, 'text-navy')}
                strokeWidth={3}
              />
            </div>
          </div>

          {message && (
            <p className={clsx('text-white font-medium', sizes.text)}>
              {message}
            </p>
          )}

          {/* Confetti particles (CSS-based simplified version) */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${50 + (Math.random() - 0.5) * 60}%`,
                    top: '50%',
                    backgroundColor: [
                      '#E2D243',
                      '#22c55e',
                      '#3b82f6',
                      '#ec4899',
                    ][i % 4],
                    animationDelay: `${i * 50}ms`,
                    animationDuration: `${800 + Math.random() * 400}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Inline success indicator for buttons/forms
 */
export function InlineSuccess({
  show,
  message = 'Success!',
  className,
}: {
  show: boolean;
  message?: string;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!isVisible) return null;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-green-400 animate-fade-in',
        className,
      )}
    >
      <Check className="w-4 h-4" />
      {message}
    </span>
  );
}

export default SuccessAnimation;
