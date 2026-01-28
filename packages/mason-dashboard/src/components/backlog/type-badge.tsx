'use client';

import type { BacklogType } from '@/types/backlog';
import { clsx } from 'clsx';

interface TypeBadgeProps {
  type: BacklogType;
  size?: 'sm' | 'md';
}

const TYPE_CONFIG: Record<BacklogType, { label: string; className: string }> = {
  dashboard: {
    label: 'Dashboard',
    className: 'bg-gold/20 text-gold border-gold/30',
  },
  discovery: {
    label: 'Discovery',
    className: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  auth: {
    label: 'Auth',
    className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  backend: {
    label: 'Backend',
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
  },
};

export function TypeBadge({ type, size = 'sm' }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];

  return (
    <span
      className={clsx(
        'inline-flex items-center border',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      {config.label}
    </span>
  );
}
