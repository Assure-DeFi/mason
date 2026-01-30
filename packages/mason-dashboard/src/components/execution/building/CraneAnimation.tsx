'use client';

/**
 * CraneAnimation - Tower crane that moves materials during construction
 *
 * Features:
 * - Tower crane with rotating arm
 * - Cable that raises/lowers
 * - Hook that picks up materials
 * - Swinging motion when moving
 */

import { motion } from 'framer-motion';

export interface CraneAnimationProps {
  isActive: boolean;
  currentFloor: number;
  totalFloors: number;
}

const COLORS = {
  craneYellow: '#f59e0b',
  craneOrange: '#ea580c',
  craneDark: '#78350f',
  cable: '#6b7280',
  gold: '#E2D243',
};

export function CraneAnimation({
  isActive,
  currentFloor,
  totalFloors,
}: CraneAnimationProps) {
  // Calculate crane arm rotation based on whether it's moving or dropping
  const armRotation = isActive ? [0, -15, 0, 15, 0] : 0;

  // Cable length based on current floor
  const maxCableLength = 120;
  const cableLength = isActive
    ? maxCableLength - (currentFloor / Math.max(totalFloors, 1)) * 60
    : 60;

  return (
    <div
      className="absolute"
      style={{
        right: -60,
        bottom: 20,
        width: 80,
        height: 200,
        zIndex: 10,
      }}
    >
      {/* Crane base */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 20,
          width: 40,
          height: 20,
          background: `linear-gradient(180deg, ${COLORS.craneYellow} 0%, ${COLORS.craneOrange} 100%)`,
          borderRadius: '4px 4px 0 0',
        }}
      />

      {/* Crane tower */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 32,
          width: 16,
          height: 160,
          background: `repeating-linear-gradient(
            0deg,
            ${COLORS.craneYellow} 0px,
            ${COLORS.craneYellow} 8px,
            ${COLORS.craneDark} 8px,
            ${COLORS.craneDark} 10px
          )`,
        }}
      >
        {/* Tower cross-bracing pattern */}
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent 0px,
              transparent 10px,
              ${COLORS.craneDark}40 10px,
              ${COLORS.craneDark}40 12px
            )`,
          }}
        />
      </div>

      {/* Operator cabin */}
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          left: 24,
          width: 24,
          height: 20,
          background: COLORS.craneOrange,
          border: `2px solid ${COLORS.craneDark}`,
          borderRadius: 2,
        }}
      >
        {/* Window */}
        <div
          className="absolute"
          style={{
            top: 4,
            left: 4,
            width: 14,
            height: 10,
            background: '#87ceeb',
            opacity: 0.6,
          }}
        />
      </div>

      {/* Rotating arm assembly */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 170,
          left: 40,
          transformOrigin: 'left center',
        }}
        animate={{ rotate: armRotation }}
        transition={{
          duration: 4,
          repeat: isActive ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {/* Main arm (jib) */}
        <div
          style={{
            width: 100,
            height: 8,
            background: `linear-gradient(90deg, ${COLORS.craneYellow} 0%, ${COLORS.craneOrange} 100%)`,
            position: 'relative',
          }}
        >
          {/* Arm lattice pattern */}
          <div
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 6px,
                ${COLORS.craneDark}60 6px,
                ${COLORS.craneDark}60 8px
              )`,
            }}
          />
        </div>

        {/* Counter-weight arm */}
        <div
          style={{
            position: 'absolute',
            left: -30,
            top: 0,
            width: 30,
            height: 8,
            background: COLORS.craneOrange,
          }}
        />

        {/* Counter-weight */}
        <div
          style={{
            position: 'absolute',
            left: -35,
            top: -5,
            width: 12,
            height: 18,
            background: COLORS.craneDark,
            borderRadius: 2,
          }}
        />

        {/* Trolley (moves along arm) */}
        <motion.div
          style={{
            position: 'absolute',
            top: -4,
            width: 12,
            height: 16,
            background: COLORS.craneYellow,
            border: `2px solid ${COLORS.craneDark}`,
            borderRadius: 2,
          }}
          animate={{
            left: isActive ? [30, 80, 30] : 50,
          }}
          transition={{
            duration: 6,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {/* Cable */}
          <motion.div
            style={{
              position: 'absolute',
              left: 4,
              top: 16,
              width: 2,
              background: COLORS.cable,
            }}
            animate={{
              height: isActive
                ? [cableLength, cableLength - 30, cableLength]
                : 60,
            }}
            transition={{
              duration: 6,
              repeat: isActive ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />

          {/* Hook */}
          <motion.div
            style={{
              position: 'absolute',
              left: 0,
              width: 10,
              height: 14,
            }}
            animate={{
              top: isActive
                ? [cableLength + 16, cableLength - 14, cableLength + 16]
                : 76,
            }}
            transition={{
              duration: 6,
              repeat: isActive ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
            <HookWithLoad isCarrying={isActive} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Warning light on top */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 38,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#ef4444',
        }}
        animate={{
          opacity: isActive ? [1, 0.3, 1] : 0.3,
          boxShadow: isActive
            ? ['0 0 8px #ef4444', '0 0 2px #ef4444', '0 0 8px #ef4444']
            : 'none',
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

interface HookWithLoadProps {
  isCarrying: boolean;
}

function HookWithLoad({ isCarrying }: HookWithLoadProps) {
  return (
    <div className="relative">
      {/* Hook */}
      <svg width="10" height="14" viewBox="0 0 10 14">
        <path
          d="M 4 0 L 4 6 Q 4 10 7 10 Q 10 10 10 7"
          fill="none"
          stroke={COLORS.cable}
          strokeWidth="2"
        />
      </svg>

      {/* Load (building material) */}
      {isCarrying && (
        <motion.div
          style={{
            position: 'absolute',
            top: 10,
            left: -3,
            width: 16,
            height: 10,
            background: `linear-gradient(180deg, ${COLORS.gold} 0%, #b8860b 100%)`,
            borderRadius: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
          animate={{
            rotate: [-2, 2, -2],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}

export default CraneAnimation;
