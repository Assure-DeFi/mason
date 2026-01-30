'use client';

import { Star, ChevronRight, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import type { BacklogItem } from '@/types/backlog';

import { TypeBadge } from './type-badge';

interface FeatureIdeasSectionProps {
  items: BacklogItem[];
  onViewDetails: (item: BacklogItem) => void;
}

export function FeatureIdeasSection({
  items,
  onViewDetails,
}: FeatureIdeasSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const displayItems = isExpanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <div className="border border-gray-800 bg-black/30">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Star className="w-5 h-5 text-gold" />
          <div>
            <h3 className="text-lg font-semibold text-white">Feature Ideas</h3>
            <p className="text-sm text-gray-500">
              New capabilities discovered in your codebase
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-gold/20 text-gold text-sm font-medium border border-gold/30">
          {items.length} ideas
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {displayItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewDetails(item)}
            className="text-left p-4 bg-black/40 border border-gray-700/50 hover:border-gold/40 transition-colors group"
          >
            <div className="flex items-start justify-between mb-2">
              <TypeBadge type={item.type} isNewFeature />
              <span className="text-xs text-gray-500">
                Impact: {item.impact_score}/10
              </span>
            </div>
            <h4 className="font-medium text-white group-hover:text-gold transition-colors mb-2">
              {item.title}
            </h4>
            <p className="text-sm text-gray-400 line-clamp-2">{item.problem}</p>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-gold border border-gray-700 hover:border-gold/40 transition-colors"
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                View all {items.length} features
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
