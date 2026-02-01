'use client';

import { Star } from 'lucide-react';

/**
 * Badge displayed for new feature items to distinguish them from improvements.
 * Shows with purple styling to match the "Feature" category color.
 */
export function FeatureBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/50"
      title="New Feature"
    >
      <Star className="w-3 h-3 fill-current" />
      FEATURE
    </span>
  );
}
