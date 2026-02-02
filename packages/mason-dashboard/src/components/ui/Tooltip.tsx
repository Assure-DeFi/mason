'use client';

import { clsx } from 'clsx';
import { useState, useRef, useEffect, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  title?: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  width?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function Tooltip({
  content,
  title,
  children,
  position = 'auto',
  width = 'md',
  className,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [computedPosition, setComputedPosition] = useState<'top' | 'bottom'>(
    'top',
  );
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && position === 'auto') {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceNeeded = 80;

      if (spaceAbove < spaceNeeded) {
        setComputedPosition('bottom');
      } else {
        setComputedPosition('top');
      }
    }
  }, [isVisible, position]);

  const actualPosition = position === 'auto' ? computedPosition : position;

  const widthClasses = {
    sm: 'w-40',
    md: 'w-56',
    lg: 'w-72',
  };

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-700 border-x-transparent border-b-transparent',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-b-gray-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-700 border-y-transparent border-r-transparent',
    right:
      'right-full top-1/2 -translate-y-1/2 border-r-gray-700 border-y-transparent border-l-transparent',
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <span
      ref={triggerRef}
      className={clsx('relative inline-flex cursor-help', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
    >
      {children}

      {isVisible && (
        <div
          className={clsx(
            'absolute z-50 px-3 py-2 bg-gray-900 border border-gray-700 rounded shadow-lg',
            widthClasses[width],
            positionClasses[actualPosition],
          )}
          role="tooltip"
        >
          {title && (
            <p className="text-xs font-semibold text-white mb-1">{title}</p>
          )}
          <div className="text-xs text-gray-400 leading-relaxed">{content}</div>
          <span
            className={clsx(
              'absolute w-0 h-0 border-4',
              arrowClasses[actualPosition],
            )}
          />
        </div>
      )}
    </span>
  );
}

export default Tooltip;
