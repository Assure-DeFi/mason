'use client';

import { clsx } from 'clsx';
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

import { RISK_LEVEL_TOOLTIPS } from '@/lib/tooltip-content';
import { getRiskLevel } from '@/types/backlog';

import { Tooltip } from '../ui/Tooltip';

interface RiskBadgeProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * RiskBadge - Displays a color-coded risk score badge
 *
 * Colors:
 * - Green (1-3): Low risk
 * - Yellow (4-5): Medium risk
 * - Orange (6-7): High risk
 * - Red (8-10): Critical risk
 */
export function RiskBadge({
  score,
  size = 'md',
  showLabel = false,
  className,
}: RiskBadgeProps) {
  if (score === null) {
    return null;
  }

  const level = getRiskLevel(score);

  const Icon = {
    low: ShieldCheck,
    medium: Shield,
    high: ShieldAlert,
    critical: AlertTriangle,
  }[level];

  const colors = {
    low: 'text-green-400 bg-green-400/10 border-green-400/30',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  }[level];

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const labels = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  }[level];

  const tooltipContent = RISK_LEVEL_TOOLTIPS[level];

  return (
    <Tooltip
      title={tooltipContent.title}
      content={tooltipContent.content}
      width="sm"
    >
      <div
        className={clsx(
          'inline-flex items-center border font-medium',
          colors,
          sizes,
          className,
        )}
      >
        <Icon className={iconSizes} />
        <span>{score}</span>
        {showLabel && <span className="ml-1">{labels}</span>}
      </div>
    </Tooltip>
  );
}
