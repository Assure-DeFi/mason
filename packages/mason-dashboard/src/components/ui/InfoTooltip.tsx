'use client';

import { clsx } from 'clsx';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tooltip } from './Tooltip';


interface InfoTooltipProps {
  content: ReactNode;
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({
  content,
  title,
  size = 'sm',
  className,
  iconClassName,
}: InfoTooltipProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  return (
    <Tooltip content={content} title={title} className={className}>
      <Info
        className={clsx(
          sizeClasses[size],
          'text-gray-500 hover:text-gray-400 transition-colors',
          iconClassName,
        )}
      />
    </Tooltip>
  );
}

export default InfoTooltip;
