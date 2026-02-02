'use client';

import { Sparkles } from 'lucide-react';

import { BADGE_TOOLTIPS } from '@/lib/tooltip-content';

import { Tooltip } from '../ui/Tooltip';

/**
 * Badge displayed for items that were previously a "banger idea" but have been
 * rotated out when a new banger was generated. These items retain the "banger"
 * tag to indicate their special status as transformative feature ideas.
 */
export function BangerBadge() {
  return (
    <Tooltip
      title={BADGE_TOOLTIPS.banger.title}
      content={BADGE_TOOLTIPS.banger.content}
      width="sm"
    >
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-gold/20 text-gold border border-gold/50">
        <Sparkles className="w-3 h-3" />
        BANGER
      </span>
    </Tooltip>
  );
}
