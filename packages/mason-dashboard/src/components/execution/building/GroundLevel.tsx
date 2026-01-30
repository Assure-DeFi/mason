'use client';

/**
 * GroundLevel - Construction site ground elements
 *
 * Features:
 * - Material staging area
 * - Construction trailer/office
 * - Safety barriers and cones
 * - Ground texture
 */

import { motion } from 'framer-motion';

export interface GroundLevelProps {
  phase: 'site_review' | 'foundation' | 'building' | 'inspection' | 'complete';
}

const COLORS = {
  dirt: '#78350f',
  concrete: '#6b7280',
  trailer: '#d4d4d8',
  trailerDark: '#a1a1aa',
  cone: '#f97316',
  barrier: '#fbbf24',
  material: '#92400e',
  gold: '#E2D243',
};

export function GroundLevel({ phase }: GroundLevelProps) {
  const showMaterials = phase === 'building' || phase === 'foundation';
  const showTrailer = phase !== 'complete';
  const isComplete = phase === 'complete';

  return (
    <div
      className="absolute"
      style={{
        bottom: -30,
        left: -80,
        width: 280,
        height: 40,
        zIndex: 2,
      }}
    >
      {/* Ground surface */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10"
        style={{
          background: isComplete
            ? `linear-gradient(90deg, ${COLORS.concrete} 0%, #52525b 50%, ${COLORS.concrete} 100%)`
            : `linear-gradient(90deg, ${COLORS.dirt} 0%, #713f12 50%, ${COLORS.dirt} 100%)`,
          borderTop: isComplete ? '2px solid #71717a' : '2px solid #92400e',
        }}
      >
        {/* Ground texture */}
        {!isComplete && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `
                radial-gradient(circle at 20% 30%, #422006 0%, transparent 20%),
                radial-gradient(circle at 60% 60%, #422006 0%, transparent 15%),
                radial-gradient(circle at 80% 20%, #422006 0%, transparent 18%)
              `,
            }}
          />
        )}
      </div>

      {/* Construction trailer */}
      {showTrailer && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          style={{
            position: 'absolute',
            bottom: 10,
            left: 0,
            width: 50,
            height: 25,
          }}
        >
          <Trailer />
        </motion.div>
      )}

      {/* Material staging area */}
      {showMaterials && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            bottom: 10,
            right: 20,
            display: 'flex',
            gap: 4,
          }}
        >
          <MaterialStack type="beams" count={3} />
          <MaterialStack type="blocks" count={4} />
        </motion.div>
      )}

      {/* Safety barriers */}
      <div
        className="absolute"
        style={{
          bottom: 10,
          left: 60,
          display: 'flex',
          gap: 30,
        }}
      >
        <SafetyCone />
        <SafetyCone />
        <SafetyCone />
      </div>

      {/* Safety barrier tape */}
      {!isComplete && (
        <div
          className="absolute"
          style={{
            bottom: 18,
            left: 70,
            width: 80,
            height: 2,
            background: `repeating-linear-gradient(
              90deg,
              ${COLORS.barrier} 0px,
              ${COLORS.barrier} 10px,
              #000 10px,
              #000 20px
            )`,
          }}
        />
      )}

      {/* Completion: Ribbon */}
      {isComplete && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            position: 'absolute',
            bottom: 15,
            left: 60,
            width: 100,
            height: 8,
            background: `linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transformOrigin: 'center',
          }}
        >
          {/* Ribbon bow */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: -6,
              width: 16,
              height: 16,
              marginLeft: -8,
              background: '#dc2626',
              borderRadius: '50%',
              boxShadow: `0 0 8px ${COLORS.gold}`,
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

function Trailer() {
  return (
    <div className="relative w-full h-full">
      {/* Trailer body */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 0,
          width: '100%',
          height: 18,
          background: `linear-gradient(180deg, ${COLORS.trailer} 0%, ${COLORS.trailerDark} 100%)`,
          border: '1px solid #71717a',
          borderRadius: 2,
        }}
      >
        {/* Window */}
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: 5,
            width: 12,
            height: 8,
            background: '#87ceeb',
            opacity: 0.6,
            border: '1px solid #52525b',
          }}
        />
        {/* Door */}
        <div
          style={{
            position: 'absolute',
            top: 3,
            right: 5,
            width: 8,
            height: 13,
            background: COLORS.trailerDark,
            border: '1px solid #71717a',
          }}
        />
        {/* Sign */}
        <div
          className="absolute text-[4px] font-bold text-gray-600"
          style={{ top: 6, left: 22 }}
        >
          OFFICE
        </div>
      </div>

      {/* Wheels */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 8,
          width: 8,
          height: 8,
          background: '#1f2937',
          borderRadius: '50%',
          border: '2px solid #374151',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 8,
          width: 8,
          height: 8,
          background: '#1f2937',
          borderRadius: '50%',
          border: '2px solid #374151',
        }}
      />

      {/* Steps */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 2,
          width: 6,
          height: 4,
          background: '#52525b',
        }}
      />
    </div>
  );
}

interface MaterialStackProps {
  type: 'beams' | 'blocks';
  count: number;
}

function MaterialStack({ type, count }: MaterialStackProps) {
  if (type === 'beams') {
    return (
      <div className="relative">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: i * 3,
              left: 0,
              width: 25,
              height: 3,
              background: `linear-gradient(180deg, #92400e 0%, ${COLORS.material} 100%)`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: 20, height: 15 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: Math.floor(i / 2) * 6,
            left: (i % 2) * 10,
            width: 8,
            height: 5,
            background: '#6b7280',
            border: '1px solid #52525b',
          }}
        />
      ))}
    </div>
  );
}

function SafetyCone() {
  return (
    <div className="relative" style={{ width: 8, height: 12 }}>
      {/* Cone body */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderBottom: `10px solid ${COLORS.cone}`,
        }}
      />
      {/* Reflective stripes */}
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          left: 1,
          width: 6,
          height: 2,
          background: 'white',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: 2,
          width: 4,
          height: 2,
          background: 'white',
        }}
      />
      {/* Base */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: -1,
          width: 10,
          height: 2,
          background: '#1f2937',
          borderRadius: 1,
        }}
      />
    </div>
  );
}

export default GroundLevel;
