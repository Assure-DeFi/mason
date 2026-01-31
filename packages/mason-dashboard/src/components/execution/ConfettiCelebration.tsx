'use client';

/**
 * ConfettiCelebration - Celebratory confetti animation
 *
 * Uses canvas-confetti for a brand-colored confetti burst.
 * Lazy-loaded via Next.js dynamic import.
 */

import { useEffect } from 'react';

export function ConfettiCelebration() {
  useEffect(() => {
    // Dynamic import to avoid SSR issues
    void import('canvas-confetti').then((confetti) => {
      const duration = 3000;
      const end = Date.now() + duration;

      // Brand colors: Gold (#E2D243) and White (#FFFFFF)
      const colors = ['#E2D243', '#FFFFFF'];

      const frame = () => {
        // Fire from bottom-left
        void confetti.default({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 1 },
          colors,
        });

        // Fire from bottom-right
        void confetti.default({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    });
  }, []);

  return null;
}

export default ConfettiCelebration;
