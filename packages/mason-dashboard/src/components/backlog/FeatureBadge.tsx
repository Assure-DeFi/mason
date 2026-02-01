'use client';

import { Star } from 'lucide-react';

import { BADGE_TOOLTIPS } from '@/lib/tooltip-content';

import { Tooltip } from '../ui/Tooltip';

/**
 * Badge displayed for new feature items to distinguish them from improvements.
 * Shows with purple styling to match the "Feature" category color.
 */
export function FeatureBadge() {
  return (
    <Tooltip
      title={BADGE_TOOLTIPS.newFeature.title}
      content={BADGE_TOOLTIPS.newFeature.content}
      width="sm"
    >
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/50">
        <Star className="w-3 h-3 fill-current" />
        FEATURE
      </span>
    </Tooltip>
  );
}
