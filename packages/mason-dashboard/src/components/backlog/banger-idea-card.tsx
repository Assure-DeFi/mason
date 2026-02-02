'use client';

import {
  Sparkles,
  ChevronRight,
  Check,
  X,
  CheckCircle,
  Trash2,
  Zap,
} from 'lucide-react';

import type { BacklogItem } from '@/types/backlog';

import { TypeBadge } from './type-badge';

interface BangerIdeaCardProps {
  item: BacklogItem;
  onViewDetails: (item: BacklogItem) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onGenerateNew?: () => void;
}

export function BangerIdeaCard({
  item,
  onViewDetails,
  onApprove,
  onReject,
  onComplete,
  onDelete,
  onGenerateNew,
}: BangerIdeaCardProps) {
  return (
    <div className="relative overflow-hidden border-2 border-gold/40 bg-gradient-to-br from-gold/10 via-black/40 to-black/60">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gold/20 blur-3xl pointer-events-none" />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 border border-gold/40">
              <Sparkles className="w-6 h-6 text-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold">
                  Banger Idea
                </span>
                <span className="text-xs text-gray-500">
                  Featured Opportunity
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                {item.title}
              </h3>
            </div>
          </div>
          <TypeBadge type={item.type} size="md" isNewFeature />
        </div>

        <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-3">
          {item.problem}
        </p>

        <div className="bg-black/40 border border-gray-700/50 p-4 mb-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Vision
          </div>
          <p className="text-gray-200 text-sm leading-relaxed line-clamp-2">
            {item.solution}
          </p>
        </div>

        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Impact</span>
            <span className="text-lg font-bold text-gold">
              {item.impact_score}/10
            </span>
          </div>
          <div className="w-px h-6 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Effort</span>
            <span className="text-lg font-bold text-gray-300">
              {item.effort_score}/10
            </span>
          </div>
          <div className="w-px h-6 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase">Priority</span>
            <span className="text-lg font-bold text-green-400">
              {item.priority_score}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewDetails(item)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gold text-navy font-semibold hover:bg-gold/90 transition-colors"
          >
            View Full Vision
            <ChevronRight className="w-4 h-4" />
          </button>

          {item.status === 'new' && (
            <>
              <button
                onClick={() => onApprove(item.id)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600/20 border border-green-600/40 text-green-400 font-medium hover:bg-green-600/30 transition-colors"
                title="Approve for execution"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => onReject(item.id)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 border border-red-600/40 text-red-400 font-medium hover:bg-red-600/30 transition-colors"
                title="Reject this idea"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}

          {(item.status === 'approved' || item.status === 'in_progress') && (
            <>
              <span
                className={`px-4 py-3 font-medium ${
                  item.status === 'in_progress'
                    ? 'bg-yellow-600/20 border border-yellow-600/40 text-yellow-400'
                    : 'bg-green-600/20 border border-green-600/40 text-green-400'
                }`}
              >
                {item.status === 'in_progress' ? 'In Progress' : 'Approved'}
              </span>
              <button
                onClick={() => onReject(item.id)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 border border-red-600/40 text-red-400 font-medium hover:bg-red-600/30 transition-colors"
                title="Reject this idea"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
              {onComplete && (
                <button
                  onClick={() => onComplete(item.id)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/20 border border-blue-600/40 text-blue-400 font-medium hover:bg-blue-600/30 transition-colors"
                  title="Mark as completed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600/20 border border-gray-600/40 text-gray-400 font-medium hover:bg-gray-600/30 transition-colors"
                  title="Delete this idea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Generate New Banger Button */}
        {onGenerateNew && (
          <div className="mt-4 pt-4 border-t border-gold/20">
            <button
              onClick={onGenerateNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30 text-gold font-semibold hover:from-gold/30 hover:to-gold/20 transition-all group"
            >
              <Zap className="w-5 h-5 group-hover:animate-pulse" />
              GENERATE A NEW BANGER
              <Sparkles className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">
              Deep dive to find ONE game-changing feature idea
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
