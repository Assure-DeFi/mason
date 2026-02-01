'use client';

import { User, Users, Settings, BarChart3, Wrench } from 'lucide-react';

import type { Benefit } from '@/types/backlog';

interface BenefitsGridProps {
  benefits: Benefit[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  users: Users,
  settings: Settings,
  chart: BarChart3,
  wrench: Wrench,
};

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  user_experience: User,
  sales_team: Users,
  operations: Settings,
  performance: BarChart3,
  reliability: Wrench,
};

export function BenefitsGrid({ benefits }: BenefitsGridProps) {
  if (!benefits || benefits.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {benefits.map((benefit, index) => {
        // Get icon from map or fall back to category default
        const IconComponent =
          ICON_MAP[benefit.icon] || CATEGORY_ICONS[benefit.category] || User;

        return (
          <div key={index} className="p-4 bg-black/30 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <IconComponent className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {benefit.title}
              </span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">
              {benefit.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
