'use client';

/**
 * IsometricBuilding - 3D isometric building that grows floor by floor
 *
 * Renders a building with:
 * - Isometric perspective using CSS transforms
 * - Bottom-up construction (foundation first, then floors)
 * - 3D depth with left/right/top faces
 * - Window grid on each floor
 * - Roof appears at completion
 */

import { motion, AnimatePresence } from 'framer-motion';

export interface IsometricBuildingProps {
  totalFloors: number;
  currentFloor: number;
  phase: 'site_review' | 'foundation' | 'building' | 'inspection' | 'complete';
  lightsOn?: boolean;
}

// Building dimensions
const FLOOR_HEIGHT = 28;
const FLOOR_WIDTH = 120;

// Colors
const COLORS = {
  foundation: '#4a5568',
  floorFront: '#1a1a2e',
  floorLeft: '#16162a',
  floorTop: '#0f0f1a',
  windowOff: '#1f2937',
  windowOn: '#fbbf24',
  windowGlow: '#fde68a',
  scaffolding: '#78350f',
  roof: '#374151',
  roofTop: '#4b5563',
  gold: '#E2D243',
};

export function IsometricBuilding({
  totalFloors,
  currentFloor,
  phase,
  lightsOn = false,
}: IsometricBuildingProps) {
  const floors = Math.max(totalFloors, 1);
  const showFoundation = phase !== 'site_review';
  const showRoof = phase === 'inspection' || phase === 'complete';
  const isComplete = phase === 'complete';

  return (
    <div
      className="relative"
      style={{
        perspective: '1000px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* Isometric container */}
      <div
        className="relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(55deg) rotateZ(-45deg)',
          width: `${FLOOR_WIDTH}px`,
          height: `${(floors + 2) * FLOOR_HEIGHT + 40}px`,
        }}
      >
        {/* Ground/Site */}
        <Ground isExcavated={phase !== 'site_review'} />

        {/* Foundation */}
        <AnimatePresence>
          {showFoundation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: 'absolute',
                bottom: 10,
                left: 0,
              }}
            >
              <Foundation />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floors - rendered bottom to top */}
        {Array.from({ length: floors }).map((_, i) => {
          const floorNum = i + 1;
          const isBuilt = floorNum < currentFloor;
          const isCurrentlyBuilding =
            floorNum === currentFloor && phase === 'building';
          const shouldShow =
            isBuilt ||
            isCurrentlyBuilding ||
            phase === 'inspection' ||
            isComplete;

          return (
            <AnimatePresence key={`floor-${floorNum}`}>
              {shouldShow && (
                <Floor
                  floorNumber={floorNum}
                  totalFloors={floors}
                  isBuilding={isCurrentlyBuilding}
                  isComplete={isBuilt || phase === 'inspection' || isComplete}
                  lightsOn={lightsOn && (isComplete || phase === 'inspection')}
                  lightDelay={floorNum * 0.2}
                />
              )}
            </AnimatePresence>
          );
        })}

        {/* Roof */}
        <AnimatePresence>
          {showRoof && <Roof totalFloors={floors} isComplete={isComplete} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Ground({ isExcavated }: { isExcavated: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: -20,
        width: FLOOR_WIDTH + 40,
        height: 20,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Ground top face */}
      <motion.div
        animate={{
          backgroundColor: isExcavated ? '#422006' : '#374151',
        }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: isExcavated
            ? 'linear-gradient(135deg, #422006 0%, #713f12 100%)'
            : 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
          border: '2px solid rgba(255,255,255,0.1)',
        }}
      />
      {/* Excavation pit lines */}
      {isExcavated && (
        <div className="absolute inset-2 border-2 border-dashed border-amber-900/50" />
      )}
    </div>
  );
}

function Foundation() {
  return (
    <div
      style={{
        position: 'relative',
        width: FLOOR_WIDTH,
        height: 24,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Foundation top */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${COLORS.foundation} 0%, #374151 100%)`,
          borderTop: '3px solid #6b7280',
          borderLeft: '3px solid #4b5563',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
        }}
      />
      {/* Foundation texture - concrete blocks pattern */}
      <div className="absolute inset-0 opacity-30">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-gray-600"
            style={{
              left: `${i * 20}px`,
              top: 0,
              width: '1px',
              height: '100%',
            }}
          />
        ))}
      </div>
      {/* Foundation label */}
      <div
        className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-400 tracking-wider"
        style={{ transform: 'rotateZ(45deg) rotateX(-55deg)' }}
      >
        FOUNDATION
      </div>
    </div>
  );
}

interface FloorProps {
  floorNumber: number;
  totalFloors: number;
  isBuilding: boolean;
  isComplete: boolean;
  lightsOn: boolean;
  lightDelay: number;
}

function Floor({
  floorNumber,
  isBuilding,
  isComplete: _isComplete,
  lightsOn,
  lightDelay,
}: FloorProps) {
  // Calculate position from bottom
  const bottomOffset = 34 + (floorNumber - 1) * FLOOR_HEIGHT;

  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{
        opacity: 1,
        scaleY: 1,
      }}
      exit={{ opacity: 0, scaleY: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: 0,
        width: FLOOR_WIDTH,
        height: FLOOR_HEIGHT,
        transformStyle: 'preserve-3d',
        transformOrigin: 'bottom center',
      }}
    >
      {/* Floor front face */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: isBuilding
            ? `linear-gradient(180deg, ${COLORS.gold}20 0%, ${COLORS.floorFront} 30%)`
            : COLORS.floorFront,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          boxShadow: isBuilding ? `inset 0 0 20px ${COLORS.gold}30` : 'none',
        }}
      >
        {/* Windows grid */}
        <div className="flex justify-around items-center h-full px-2 py-1">
          {Array.from({ length: 5 }).map((_, windowIndex) => (
            <Window
              key={windowIndex}
              isLit={lightsOn}
              delay={lightDelay + windowIndex * 0.05}
            />
          ))}
        </div>
      </div>

      {/* Building animation pulse */}
      {isBuilding && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, ${COLORS.gold}40 0%, transparent 50%)`,
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Floor number indicator (visible during construction) */}
      {isBuilding && (
        <motion.div
          className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs font-bold text-gold"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            transform: 'rotateZ(45deg) rotateX(-55deg) translateY(-50%)',
          }}
        >
          F{floorNumber}
        </motion.div>
      )}
    </motion.div>
  );
}

interface WindowProps {
  isLit: boolean;
  delay: number;
}

function Window({ isLit, delay }: WindowProps) {
  return (
    <motion.div
      className="relative"
      style={{
        width: 16,
        height: 20,
        background: COLORS.windowOff,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      animate={{
        background: isLit ? COLORS.windowOn : COLORS.windowOff,
        boxShadow: isLit
          ? `0 0 8px ${COLORS.windowGlow}, 0 0 16px ${COLORS.windowOn}50`
          : 'none',
      }}
      transition={{ delay, duration: 0.3 }}
    >
      {/* Window panes */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(90deg, transparent 48%, rgba(255,255,255,0.2) 50%, transparent 52%),
            linear-gradient(180deg, transparent 48%, rgba(255,255,255,0.2) 50%, transparent 52%)
          `,
        }}
      />
    </motion.div>
  );
}

interface RoofProps {
  totalFloors: number;
  isComplete: boolean;
}

function Roof({ totalFloors, isComplete }: RoofProps) {
  const bottomOffset = 34 + totalFloors * FLOOR_HEIGHT;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: -5,
        width: FLOOR_WIDTH + 10,
        height: 20,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Roof top */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: isComplete
            ? `linear-gradient(135deg, ${COLORS.gold}40 0%, ${COLORS.roofTop} 50%, ${COLORS.roof} 100%)`
            : `linear-gradient(135deg, ${COLORS.roofTop} 0%, ${COLORS.roof} 100%)`,
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: isComplete ? `0 0 20px ${COLORS.gold}40` : 'none',
        }}
      />

      {/* Roof details - antenna/spire */}
      {isComplete && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '100%',
            width: 4,
            height: 30,
            background: `linear-gradient(180deg, ${COLORS.gold} 0%, ${COLORS.roof} 100%)`,
            transformOrigin: 'bottom center',
            marginLeft: -2,
          }}
        />
      )}
    </motion.div>
  );
}

export default IsometricBuilding;
