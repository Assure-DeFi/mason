'use client';

/**
 * CompletionCelebration - Epic completion sequence
 *
 * Features:
 * - Lights turn on floor by floor
 * - Grand reveal animation
 * - "COMPLETE" banner
 * - Optional replay button
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export interface CompletionCelebrationProps {
  itemTitle: string;
  isComplete: boolean;
  onReplay?: () => void;
}

const COLORS = {
  gold: '#E2D243',
  goldLight: '#fef08a',
  ribbon: '#dc2626',
  banner: '#0a0724',
};

export function CompletionCelebration({
  itemTitle,
  isComplete,
  onReplay,
}: CompletionCelebrationProps) {
  const [showReplayButton, setShowReplayButton] = useState(false);

  return (
    <AnimatePresence>
      {isComplete && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onAnimationComplete={() => setShowReplayButton(true)}
        >
          {/* Celebration banner */}
          <motion.div
            className="relative mb-4"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
          >
            <Banner title="COMPLETE" />
          </motion.div>

          {/* Project title */}
          <motion.div
            className="text-center px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
          >
            <div className="text-sm text-gray-400 mb-1">Successfully built</div>
            <div className="text-lg font-bold text-white truncate max-w-[200px]">
              {itemTitle}
            </div>
          </motion.div>

          {/* Certificate badge */}
          <motion.div
            className="mt-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2.5, type: 'spring' }}
          >
            <CertificateBadge />
          </motion.div>

          {/* Replay button */}
          {showReplayButton && onReplay && (
            <motion.button
              className="mt-4 px-4 py-2 bg-navy border border-gold/30 text-gold text-sm rounded hover:bg-gold/10 transition-colors pointer-events-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onReplay}
            >
              Watch Replay
            </motion.button>
          )}

          {/* Spotlight effect */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 50% 60%, ${COLORS.gold}15 0%, transparent 70%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.7] }}
            transition={{ duration: 2, delay: 1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface BannerProps {
  title: string;
}

function Banner({ title }: BannerProps) {
  return (
    <div className="relative">
      {/* Banner body */}
      <motion.div
        className="relative px-8 py-3 text-center"
        style={{
          background: `linear-gradient(180deg, ${COLORS.banner} 0%, #1a1a2e 100%)`,
          border: `3px solid ${COLORS.gold}`,
          boxShadow: `0 0 20px ${COLORS.gold}40, inset 0 0 20px ${COLORS.gold}10`,
        }}
      >
        {/* Decorative corners */}
        <div
          className="absolute -top-1 -left-1 w-3 h-3"
          style={{ background: COLORS.gold }}
        />
        <div
          className="absolute -top-1 -right-1 w-3 h-3"
          style={{ background: COLORS.gold }}
        />
        <div
          className="absolute -bottom-1 -left-1 w-3 h-3"
          style={{ background: COLORS.gold }}
        />
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3"
          style={{ background: COLORS.gold }}
        />

        {/* Text */}
        <motion.span
          className="text-2xl font-bold tracking-widest"
          style={{
            color: COLORS.gold,
            textShadow: `0 0 10px ${COLORS.gold}`,
          }}
          animate={{
            textShadow: [
              `0 0 10px ${COLORS.gold}`,
              `0 0 20px ${COLORS.gold}`,
              `0 0 10px ${COLORS.gold}`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {title}
        </motion.span>
      </motion.div>

      {/* Banner ribbons */}
      <div
        className="absolute -left-3 top-1/2 -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderTop: '15px solid transparent',
          borderBottom: '15px solid transparent',
          borderRight: `12px solid ${COLORS.gold}`,
        }}
      />
      <div
        className="absolute -right-3 top-1/2 -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderTop: '15px solid transparent',
          borderBottom: '15px solid transparent',
          borderLeft: `12px solid ${COLORS.gold}`,
        }}
      />
    </div>
  );
}

function CertificateBadge() {
  return (
    <motion.div
      className="relative"
      animate={{ rotate: [0, 2, -2, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Badge circle */}
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${COLORS.gold} 0%, #b8860b 100%)`,
          boxShadow: `0 4px 12px ${COLORS.gold}60, inset 0 2px 4px rgba(255,255,255,0.3)`,
        }}
      >
        {/* Inner ring */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        />

        {/* Check mark */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0a0724"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6L9 17l-5-5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 2.8, duration: 0.5 }}
          />
        </svg>
      </div>

      {/* Ribbon tails */}
      <div
        className="absolute -bottom-3 left-2"
        style={{
          width: 12,
          height: 20,
          background: COLORS.ribbon,
          transform: 'rotate(-15deg)',
          transformOrigin: 'top center',
        }}
      />
      <div
        className="absolute -bottom-3 right-2"
        style={{
          width: 12,
          height: 20,
          background: COLORS.ribbon,
          transform: 'rotate(15deg)',
          transformOrigin: 'top center',
        }}
      />
    </motion.div>
  );
}

export default CompletionCelebration;
