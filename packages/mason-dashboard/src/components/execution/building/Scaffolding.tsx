'use client';

/**
 * Scaffolding - Construction scaffolding that wraps the current floor
 *
 * Features:
 * - Metal scaffolding poles and platforms
 * - Rises with each floor being built
 * - Disappears when building is complete
 */

import { motion, AnimatePresence } from 'framer-motion';

export interface ScaffoldingProps {
  currentFloor: number;
  totalFloors: number;
  isVisible: boolean;
}

const COLORS = {
  pole: '#6b7280',
  platform: '#78716c',
  plank: '#a8a29e',
  brace: '#52525b',
};

const FLOOR_HEIGHT = 28;

export function Scaffolding({
  currentFloor,
  totalFloors: _totalFloors,
  isVisible,
}: ScaffoldingProps) {
  // Calculate scaffolding position based on current floor
  const bottomOffset = 34 + (currentFloor - 1) * FLOOR_HEIGHT;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            bottom: bottomOffset - 10,
            left: -25,
            width: 20,
            height: FLOOR_HEIGHT + 20,
            zIndex: 5,
          }}
        >
          {/* Left scaffolding unit */}
          <ScaffoldUnit />
        </motion.div>
      )}

      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            bottom: bottomOffset - 10,
            right: -25,
            width: 20,
            height: FLOOR_HEIGHT + 20,
            zIndex: 5,
          }}
        >
          {/* Right scaffolding unit */}
          <ScaffoldUnit mirror />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ScaffoldUnitProps {
  mirror?: boolean;
}

function ScaffoldUnit({ mirror = false }: ScaffoldUnitProps) {
  return (
    <div
      className="relative w-full h-full"
      style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
    >
      {/* Vertical poles */}
      <div
        style={{
          position: 'absolute',
          left: 2,
          top: 0,
          width: 3,
          height: '100%',
          background: COLORS.pole,
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.2)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 2,
          top: 0,
          width: 3,
          height: '100%',
          background: COLORS.pole,
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.2)',
        }}
      />

      {/* Horizontal platforms */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 5,
          width: '100%',
          height: 4,
          background: COLORS.platform,
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {/* Platform planks */}
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              ${COLORS.plank} 0px,
              ${COLORS.plank} 3px,
              ${COLORS.platform} 3px,
              ${COLORS.platform} 4px
            )`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 5,
          width: '100%',
          height: 4,
          background: COLORS.platform,
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              ${COLORS.plank} 0px,
              ${COLORS.plank} 3px,
              ${COLORS.platform} 3px,
              ${COLORS.platform} 4px
            )`,
          }}
        />
      </div>

      {/* Cross bracing */}
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox="0 0 20 48"
        preserveAspectRatio="none"
      >
        <line
          x1="4"
          y1="10"
          x2="16"
          y2="38"
          stroke={COLORS.brace}
          strokeWidth="1.5"
        />
        <line
          x1="16"
          y1="10"
          x2="4"
          y2="38"
          stroke={COLORS.brace}
          strokeWidth="1.5"
        />
      </svg>

      {/* Safety netting effect */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `repeating-linear-gradient(
            45deg,
            transparent 0px,
            transparent 2px,
            #22c55e 2px,
            #22c55e 3px
          )`,
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
}

export default Scaffolding;
