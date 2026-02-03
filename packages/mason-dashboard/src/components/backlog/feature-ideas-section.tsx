'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Check,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

import type { BacklogItem } from '@/types/backlog';

import { BangerBadge } from './BangerBadge';
import { TypeBadge } from './type-badge';

interface FeatureIdeasSectionProps {
  items: BacklogItem[];
  onViewDetails: (item: BacklogItem) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function FeatureIdeasSection({
  items,
  onViewDetails,
  onApprove,
  onReject,
}: FeatureIdeasSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Only show new items for approve/reject flow
  const newItems = items.filter((item) => item.status === 'new');
  const displayItems = newItems.slice(0, 3);
  const emptySlots = Math.max(0, 3 - displayItems.length);

  const handleApprove = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setApprovingId(itemId);
    try {
      await onApprove(itemId);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setRejectingId(itemId);
    try {
      await onReject(itemId);
    } finally {
      setRejectingId(null);
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

  if (isDismissed) {
    return null;
  }

  // Full empty state - no feature ideas at all
  if (newItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative border border-gray-700/50 bg-gradient-to-br from-zinc-900/50 via-black to-black"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 border border-purple-500/30">
                <Star className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Feature Ideas</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  New capabilities discovered in your codebase
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-gray-800/30 border border-gray-700 mb-4">
              <Sparkles className="w-10 h-10 text-gray-500" />
            </div>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">
              No Feature Ideas Yet
            </h4>
            <p className="text-sm text-gray-500 mb-6 max-w-md">
              Run a PM Review with feature ideation to discover new capabilities
              and improvements for your codebase.
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-black border border-gray-700 font-mono text-sm">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300">/pm-review area:feature</span>
              </div>
              <p className="text-xs text-gray-600">
                Run this command in Claude Code to generate feature ideas
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative border border-purple-500/30 bg-gradient-to-br from-zinc-900 via-black to-black"
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/30">
              <Star className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Feature Ideas</h3>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium border border-purple-500/30">
                  {newItems.length} new
                </span>
                <div className="relative" ref={tooltipRef}>
                  <button
                    onClick={() => setShowTooltip(!showTooltip)}
                    className="p-0.5 text-gray-500 hover:text-purple-400 transition-colors"
                    aria-label="About feature ideas"
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
                        className="absolute left-0 top-6 z-50 w-80 p-4 bg-black border border-purple-500/30 shadow-2xl"
                      >
                        <div className="text-xs text-gray-400 space-y-2">
                          <p className="font-semibold text-purple-400">
                            Feature Ideas:
                          </p>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>New capabilities for your codebase</li>
                            <li>Discovered during PM review analysis</li>
                            <li>Ranked by impact and feasibility</li>
                            <li>Approve to add to execution queue</li>
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                New capabilities discovered in your codebase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
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

        {/* Feature Ideas Grid */}
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
                  {/* Actual feature idea cards */}
                  {displayItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, x: -20 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                      onClick={() => onViewDetails(item)}
                      className="flex flex-col text-left p-4 bg-black/60 border border-gray-700 hover:border-purple-500/50 transition-all group cursor-pointer"
                    >
                      {/* Card content */}
                      <div className="flex-1">
                        {/* Title and type */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <TypeBadge type={item.type} isNewFeature />
                            {item.tags?.includes('banger') && <BangerBadge />}
                          </div>
                          <span className="text-xs font-bold text-purple-400">
                            #{idx + 1}
                          </span>
                        </div>

                        <h4 className="font-semibold text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
                          {item.title}
                        </h4>

                        {/* Problem description */}
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                          {item.problem}
                        </p>

                        {/* Impact score */}
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs">
                            Impact: {item.impact_score}/10
                          </span>
                        </div>
                      </div>

                      {/* Footer - always at bottom */}
                      <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Priority
                          </span>
                          <span className="text-sm font-bold text-green-400">
                            {item.priority_score}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleReject(e, item.id)}
                            disabled={
                              rejectingId === item.id || approvingId === item.id
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-600/50 text-red-400 text-xs font-semibold hover:bg-red-600/30 hover:border-red-500 transition-all disabled:opacity-50"
                          >
                            {rejectingId === item.id ? (
                              <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            Reject
                          </button>
                          <button
                            onClick={(e) => handleApprove(e, item.id)}
                            disabled={
                              approvingId === item.id || rejectingId === item.id
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-900/30"
                          >
                            {approvingId === item.id ? (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Empty placeholder slots */}
                  {Array.from({ length: emptySlots }).map((_, idx) => (
                    <motion.div
                      key={`empty-${idx}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center p-6 bg-black/30 border border-dashed border-gray-700/50 min-h-[200px]"
                    >
                      <Sparkles className="w-8 h-8 text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 text-center mb-1">
                        Slot available
                      </p>
                      <p className="text-xs text-gray-600 text-center">
                        Run /pm-review area:feature
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Generate more ideas CTA */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Want more feature ideas? Run a PM review with feature
                    ideation enabled.
                  </p>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-black border border-gray-700 font-mono text-xs">
                    <Terminal className="w-3 h-3 text-purple-400" />
                    <span className="text-gray-400">
                      /pm-review area:feature
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
