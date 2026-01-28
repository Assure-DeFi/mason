'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface HelpTooltipProps {
  /** The help content to display */
  content: string;
  /** Optional title for the tooltip */
  title?: string;
  /** Size of the help icon */
  size?: 'sm' | 'md';
  /** Position preference for the tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional className for the container */
  className?: string;
}

export function HelpTooltip({
  content,
  title,
  size = 'sm',
  position = 'top',
  className,
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Adjust position if tooltip would overflow viewport
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;

    let newPosition = position;

    // Check if tooltip would overflow
    if (
      position === 'top' &&
      triggerRect.top - tooltipRect.height - padding < 0
    ) {
      newPosition = 'bottom';
    } else if (
      position === 'bottom' &&
      triggerRect.bottom + tooltipRect.height + padding > window.innerHeight
    ) {
      newPosition = 'top';
    } else if (
      position === 'left' &&
      triggerRect.left - tooltipRect.width - padding < 0
    ) {
      newPosition = 'right';
    } else if (
      position === 'right' &&
      triggerRect.right + tooltipRect.width + padding > window.innerWidth
    ) {
      newPosition = 'left';
    }

    if (newPosition !== actualPosition) {
      setActualPosition(newPosition);
    }
  }, [isOpen, position, actualPosition]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-700 border-x-transparent border-b-transparent',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-b-gray-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-700 border-y-transparent border-r-transparent',
    right:
      'right-full top-1/2 -translate-y-1/2 border-r-gray-700 border-y-transparent border-l-transparent',
  };

  return (
    <div className={clsx('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className={clsx(
          'inline-flex items-center justify-center text-gray-500 hover:text-gray-300 focus:text-gold focus:outline-none transition-colors',
          size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
        )}
        aria-label="Help"
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-full h-full" />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={clsx(
            'absolute z-50 w-64 rounded border border-gray-700 bg-gray-900 p-3 shadow-lg',
            positionClasses[actualPosition],
          )}
        >
          {title && (
            <p className="mb-1 text-sm font-medium text-white">{title}</p>
          )}
          <p className="text-sm text-gray-300 leading-relaxed">{content}</p>

          {/* Arrow */}
          <span
            className={clsx(
              'absolute w-0 h-0 border-4',
              arrowClasses[actualPosition],
            )}
          />
        </div>
      )}
    </div>
  );
}

export default HelpTooltip;
