'use client';

import { clsx } from 'clsx';
import { Star } from 'lucide-react';

import { CATEGORY_TOOLTIPS } from '@/lib/tooltip-content';
import type { BacklogCategory, BacklogType } from '@/types/backlog';
import { mapLegacyTypeToCategory } from '@/types/backlog';

import { Tooltip } from '../ui/Tooltip';

interface CategoryBadgeProps {
  type: BacklogType;
  size?: 'sm' | 'md';
  isNewFeature?: boolean;
}

/**
 * Category configuration with colors matching the plan:
 * - Feature: Purple + Star
 * - UI: Gold
 * - UX: Cyan
 * - API: Green
 * - Data: Blue
 * - Security: Red
 * - Performance: Orange
 * - Code Quality: Gray
 */
const CATEGORY_CONFIG: Record<
  BacklogCategory,
  { label: string; className: string }
> = {
  feature: {
    label: 'Feature',
    className: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  ui: {
    label: 'UI',
    className: 'bg-gold/20 text-gold border-gold/30',
  },
  ux: {
    label: 'UX',
    className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  api: {
    label: 'API',
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
  },
  data: {
    label: 'Data',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  security: {
    label: 'Security',
    className: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
  performance: {
    label: 'Performance',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  },
  'code-quality': {
    label: 'Code Quality',
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  },
};

export function CategoryBadge({
  type,
  size = 'sm',
  isNewFeature,
}: CategoryBadgeProps) {
  // Map legacy types to new categories
  const category = mapLegacyTypeToCategory(type);
  const config = CATEGORY_CONFIG[category];
  const tooltipContent = CATEGORY_TOOLTIPS[category];

  return (
    <Tooltip
      title={tooltipContent.title}
      content={tooltipContent.content}
      width="sm"
    >
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
    </Tooltip>
  );
}

// Re-export for backwards compatibility
export { CategoryBadge as TypeBadge };
