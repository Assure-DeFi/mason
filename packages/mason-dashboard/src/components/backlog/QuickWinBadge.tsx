'use client';

import { clsx } from 'clsx';
import { Zap, TrendingUp, Leaf } from 'lucide-react';

import { BADGE_TOOLTIPS } from '@/lib/tooltip-content';

import { Tooltip } from '../ui/Tooltip';

interface QuickWinBadgeProps {
  /** Impact score (1-10) */
  impactScore: number;
  /** Effort score (1-10) */
  effortScore: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show all applicable badges or just the primary */
  showAll?: boolean;
}

type BadgeType = 'quick-win' | 'high-impact' | 'low-hanging-fruit';

interface BadgeConfig {
  type: BadgeType;
  label: string;
  icon: React.ReactNode;
  className: string;
  priority: number;
  tooltipKey: keyof typeof BADGE_TOOLTIPS;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  {
    type: 'quick-win',
    label: 'Quick Win',
    icon: <Zap className="w-3 h-3" />,
    className: 'bg-gold/20 text-gold border-gold/30',
    priority: 1,
    tooltipKey: 'quickWin' as const,
  },
  {
    type: 'high-impact',
    label: 'High Impact',
    icon: <TrendingUp className="w-3 h-3" />,
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
    priority: 2,
    tooltipKey: 'highImpact' as const,
  },
  {
    type: 'low-hanging-fruit',
    label: 'Easy',
    icon: <Leaf className="w-3 h-3" />,
    className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    priority: 3,
    tooltipKey: 'lowHangingFruit' as const,
  },
];

function determineBadges(
  impactScore: number,
  effortScore: number,
): BadgeType[] {
  const badges: BadgeType[] = [];

  // Quick Win: High impact (≥7) AND low effort (≤3)
  if (impactScore >= 7 && effortScore <= 3) {
    badges.push('quick-win');
  }

  // High Impact: Very high impact (≥9)
  if (impactScore >= 9) {
    badges.push('high-impact');
  }

  // Low Hanging Fruit: Very low effort (≤2)
  if (effortScore <= 2) {
    badges.push('low-hanging-fruit');
  }

  return badges;
}

export function QuickWinBadge({
  impactScore,
  effortScore,
  size = 'sm',
  showAll = false,
}: QuickWinBadgeProps) {
  const badges = determineBadges(impactScore, effortScore);

  if (badges.length === 0) {
    return null;
  }

  // Get badge configs to render
  const badgesToRender = showAll
    ? badges
        .map((type) => BADGE_CONFIGS.find((config) => config.type === type)!)
        .sort((a, b) => a.priority - b.priority)
    : [BADGE_CONFIGS.find((config) => config.type === badges[0])!];

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
  };

  return (
    <div className="flex items-center gap-1">
      {badgesToRender.map((config) => {
        const tooltipContent = BADGE_TOOLTIPS[config.tooltipKey];
        return (
          <Tooltip
            key={config.type}
            title={tooltipContent.title}
            content={tooltipContent.content}
            width="sm"
          >
            <span
              className={clsx(
                'inline-flex items-center border rounded',
                config.className,
                sizeClasses[size],
              )}
            >
              {config.icon}
              <span>{config.label}</span>
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}

/**
 * Hook to check if an item qualifies for any badge
 */
export function useQuickWinStatus(impactScore: number, effortScore: number) {
  const badges = determineBadges(impactScore, effortScore);

  return {
    hasQuickWin: badges.includes('quick-win'),
    hasHighImpact: badges.includes('high-impact'),
    hasLowHangingFruit: badges.includes('low-hanging-fruit'),
    hasBadge: badges.length > 0,
    primaryBadge: badges[0] || null,
    allBadges: badges,
  };
}

export default QuickWinBadge;
