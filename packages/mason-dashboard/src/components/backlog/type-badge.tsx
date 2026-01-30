'use client';

import { clsx } from 'clsx';
import { Star } from 'lucide-react';

import type { BacklogType } from '@/types/backlog';

interface TypeBadgeProps {
  type: BacklogType;
  size?: 'sm' | 'md';
  isNewFeature?: boolean;
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

export function TypeBadge({ type, size = 'sm', isNewFeature }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 border',
        config.className,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      )}
    >
      {isNewFeature && <Star className="w-3 h-3 fill-current" />}
      {config.label}
    </span>
  );
}
