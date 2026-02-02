'use client';

import { Sparkles, Zap, Lightbulb } from 'lucide-react';

interface BangerEmptyStateProps {
  onGenerateNew: () => void;
}

export function BangerEmptyState({ onGenerateNew }: BangerEmptyStateProps) {
  return (
    <div className="relative overflow-hidden border-2 border-dashed border-gold/30 bg-gradient-to-br from-gold/5 via-black/40 to-black/60">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gold/10 blur-3xl pointer-events-none" />

      <div className="relative p-8 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-gold/10 border border-gold/30 mb-4">
          <Lightbulb className="w-8 h-8 text-gold" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          No Banger Idea Yet
        </h3>

        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
          Let Mason deep dive into your codebase and discover ONE game-changing
          feature that would blow your users away.
        </p>

        <button
          onClick={onGenerateNew}
          className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gold to-gold/80 text-navy font-bold text-lg hover:from-gold/90 hover:to-gold/70 transition-all group shadow-lg shadow-gold/20"
        >
          <Zap className="w-6 h-6 group-hover:animate-pulse" />
          GENERATE A BANGER
          <Sparkles className="w-5 h-5" />
        </button>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gold/60 rounded-full" />
            Deep codebase analysis
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gold/60 rounded-full" />
            10 ideas generated
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gold/60 rounded-full" />
            Best one delivered
          </div>
        </div>
      </div>
    </div>
  );
}
