'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Check,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import type { BacklogItem } from '@/types/backlog';

import { TypeBadge } from './type-badge';

interface RecommendedItem {
  item: BacklogItem;
  reasoning: string;
  tags: string[];
}

interface MasonRecommendsProps {
  recommendations: RecommendedItem[];
  onItemClick: (itemId: string) => void;
  onApprove: (itemId: string) => Promise<void>;
}

export function MasonRecommends({
  recommendations,
  onItemClick,
  onApprove,
}: MasonRecommendsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleApprove = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setApprovingId(itemId);
    try {
      await onApprove(itemId);
    } finally {
      setApprovingId(null);
    }
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isDismissed || recommendations.length === 0) {
    return null;
  }

  const displayedRecommendations = recommendations.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative border border-gold/30 bg-gradient-to-br from-zinc-900 via-black to-black"
    >
      {/* Gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 border border-gold/30">
              <Lightbulb className="w-6 h-6 text-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gold">
                  Mason Recommends
                </h3>
                <div className="relative" ref={tooltipRef}>
                  <button
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="p-0.5 text-gray-500 hover:text-gold transition-colors"
                    aria-label="Why this?"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-6 z-50 w-80 p-4 bg-black border border-gold/30 shadow-2xl"
                      >
                        <div className="text-xs text-gray-400 space-y-2">
                          <p className="font-semibold text-gold">
                            Recommendation Logic:
                          </p>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>High priority score (impact vs. effort)</li>
                            <li>New items awaiting approval</li>
                            <li>Strategic alignment with recent work</li>
                            <li>Dependencies and blockers resolved</li>
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Strategic next steps based on your backlog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-gray-400 hover:text-gold transition-colors"
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recommendations */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {displayedRecommendations.map((rec, idx) => (
                    <motion.div
                      key={rec.item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, x: -20 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                      onClick={() => onItemClick(rec.item.id)}
                      className="flex flex-col text-left p-4 bg-black/60 border border-gray-700 hover:border-gold/50 transition-all group cursor-pointer"
                    >
                      {/* Card content */}
                      <div className="flex-1">
                        {/* Title and type */}
                        <div className="flex items-start justify-between mb-3">
                          <TypeBadge
                            type={rec.item.type}
                            isNewFeature={rec.item.is_new_feature}
                          />
                          <span className="text-xs font-bold text-gold">
                            #{idx + 1}
                          </span>
                        </div>

                        <h4 className="font-semibold text-white group-hover:text-gold transition-colors mb-2 line-clamp-2">
                          {rec.item.title}
                        </h4>

                        {/* Reasoning */}
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                          {rec.reasoning}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {rec.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer - always at bottom */}
                      <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Priority
                          </span>
                          <span className="text-sm font-bold text-green-400">
                            {rec.item.priority_score}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleApprove(e, rec.item.id)}
                          disabled={approvingId === rec.item.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-semibold hover:bg-green-500 transition-all disabled:opacity-50 shadow-lg shadow-green-900/30"
                        >
                          {approvingId === rec.item.id ? (
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
