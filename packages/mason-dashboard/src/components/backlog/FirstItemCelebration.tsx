'use client';

import { X, Sparkles, MousePointer, Check, Play } from 'lucide-react';
import { useEffect, useState } from 'react';

import { MasonTagline } from '@/components/brand';

interface FirstItemCelebrationProps {
  itemCount: number;
  onDismiss: () => void;
}

const STORAGE_KEY = 'mason_has_seen_first_items';

export function FirstItemCelebration({
  itemCount,
  onDismiss,
}: FirstItemCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen this
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen && itemCount > 0) {
      setIsVisible(true);
    }
  }, [itemCount]);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-md mx-4 rounded-lg border border-gray-800 bg-navy p-6 shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/20 mb-4">
            <Sparkles className="w-8 h-8 text-gold" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            You found {itemCount} improvement{itemCount !== 1 ? 's' : ''}!
          </h2>
          <p className="text-gray-400 text-sm">
            Great work! Here&apos;s what to do next.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 text-gold text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-white">Click any item</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                See details and the suggested implementation
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 text-gold text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-white">
                  Approve the ones you want
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Or defer/reject items you&apos;re not ready for
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/20 text-gold text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-white">
                  Execute approved items
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Click &ldquo;Execute Approved&rdquo; when you&apos;re ready
              </p>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <MasonTagline size="sm" variant="muted" className="mb-4 text-center" />

        {/* CTA */}
        <button
          onClick={handleDismiss}
          className="w-full rounded-md bg-gold px-6 py-3 font-semibold text-navy transition-opacity hover:opacity-90"
        >
          Got it, let me explore
        </button>
      </div>
    </div>
  );
}

export default FirstItemCelebration;
