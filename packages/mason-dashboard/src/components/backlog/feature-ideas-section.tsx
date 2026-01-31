'use client';

import {
  Star,
  ChevronRight,
  ChevronUp,
  Check,
  X,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import type { BacklogItem } from '@/types/backlog';

import { BangerBadge } from './BangerBadge';
import { TypeBadge } from './type-badge';

interface FeatureIdeasSectionProps {
  items: BacklogItem[];
  onViewDetails: (item: BacklogItem) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function FeatureIdeasSection({
  items,
  onViewDetails,
  onApprove,
  onReject,
  onComplete,
  onDelete,
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
          <div
            key={item.id}
            className="flex flex-col p-4 bg-black/40 border border-gray-700/50 hover:border-gold/40 transition-colors group"
          >
            <button
              onClick={() => onViewDetails(item)}
              className="text-left flex-1"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TypeBadge type={item.type} isNewFeature />
                  {item.tags?.includes('banger') && <BangerBadge />}
                </div>
                <span className="text-xs text-gray-500">
                  Impact: {item.impact_score}/10
                </span>
              </div>
              <h4 className="font-medium text-white group-hover:text-gold transition-colors mb-2">
                {item.title}
              </h4>
              <p className="text-sm text-gray-400 line-clamp-2">
                {item.problem}
              </p>
            </button>

            {/* Action buttons based on status */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/50">
              {item.status === 'new' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(item.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-600/20 border border-green-600/40 text-green-400 text-xs font-medium hover:bg-green-600/30 transition-colors"
                    title="Approve for execution"
                  >
                    <Check className="w-3 h-3" />
                    Approve
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(item.id);
                    }}
                    className="flex items-center justify-center p-1.5 bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 transition-colors"
                    title="Reject this idea"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}

              {(item.status === 'approved' ||
                item.status === 'in_progress') && (
                <>
                  <span
                    className={`flex-1 text-center px-2 py-1.5 text-xs font-medium ${
                      item.status === 'in_progress'
                        ? 'bg-yellow-600/20 border border-yellow-600/40 text-yellow-400'
                        : 'bg-green-600/20 border border-green-600/40 text-green-400'
                    }`}
                  >
                    {item.status === 'in_progress' ? 'In Progress' : 'Approved'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(item.id);
                    }}
                    className="flex items-center justify-center p-1.5 bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/30 transition-colors"
                    title="Mark as completed"
                  >
                    <CheckCircle className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(item.id);
                    }}
                    className="flex items-center justify-center p-1.5 bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 transition-colors"
                    title="Reject this idea"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="flex items-center justify-center p-1.5 bg-gray-600/20 border border-gray-600/40 text-gray-400 hover:bg-gray-600/30 transition-colors"
                    title="Delete this idea"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
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
