'use client';

/**
 * ConstructionWorkers - Animated workers on the construction site
 *
 * Features:
 * - Tiny workers on scaffolding
 * - Welding sparks animation
 * - Workers walking and working
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

export interface ConstructionWorkersProps {
  currentFloor: number;
  totalFloors: number;
  phase: 'site_review' | 'foundation' | 'building' | 'inspection' | 'complete';
}

const FLOOR_HEIGHT = 28;

const COLORS = {
  helmet: '#fbbf24',
  helmetWhite: '#f5f5f4',
  vest: '#f97316',
  body: '#3b82f6',
  weldSpark: '#fef08a',
};

export function ConstructionWorkers({
  currentFloor,
  totalFloors: _totalFloors,
  phase,
}: ConstructionWorkersProps) {
  const showWorkers = phase === 'building' || phase === 'foundation';
  const bottomOffset = 34 + (currentFloor - 1) * FLOOR_HEIGHT;

  // Generate random worker positions
  const workers = useMemo(
    () => [
      { id: 1, x: 20, activity: 'welding' as const },
      { id: 2, x: 60, activity: 'walking' as const },
      { id: 3, x: 90, activity: 'working' as const },
    ],
    [],
  );

  if (!showWorkers) {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: bottomOffset + 5,
        left: 0,
        width: 120,
        height: FLOOR_HEIGHT,
        zIndex: 15,
      }}
    >
      {workers.map((worker) => (
        <Worker key={worker.id} x={worker.x} activity={worker.activity} />
      ))}

      {/* Ground level workers */}
      {phase === 'building' && (
        <>
          <Worker
            x={-40}
            activity="walking"
            style={{ bottom: -(bottomOffset - 10) }}
          />
          <Worker
            x={140}
            activity="working"
            style={{ bottom: -(bottomOffset - 10) }}
          />
        </>
      )}
    </div>
  );
}

interface WorkerProps {
  x: number;
  activity: 'welding' | 'walking' | 'working';
  style?: React.CSSProperties;
}

function Worker({ x, activity, style }: WorkerProps) {
  return (
    <motion.div
      className="absolute"
      style={{
        left: x,
        bottom: 0,
        ...style,
      }}
    >
      {/* Worker figure */}
      <div className="relative" style={{ width: 8, height: 14 }}>
        {/* Hard hat */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 1,
            width: 6,
            height: 3,
            background:
              activity === 'welding' ? COLORS.helmet : COLORS.helmetWhite,
            borderRadius: '3px 3px 0 0',
          }}
          animate={
            activity === 'walking'
              ? { y: [0, -1, 0] }
              : activity === 'working'
                ? { rotate: [-5, 5, -5] }
                : {}
          }
          transition={{ duration: 0.5, repeat: Infinity }}
        />

        {/* Body */}
        <motion.div
          style={{
            position: 'absolute',
            top: 3,
            left: 1,
            width: 6,
            height: 7,
            background: COLORS.vest,
            borderRadius: 1,
          }}
          animate={
            activity === 'walking'
              ? { y: [0, -1, 0] }
              : activity === 'working'
                ? { rotate: [-3, 3, -3] }
                : {}
          }
          transition={{ duration: 0.5, repeat: Infinity }}
        />

        {/* Legs */}
        <motion.div
          style={{
            position: 'absolute',
            top: 10,
            left: 1,
            width: 2,
            height: 4,
            background: COLORS.body,
          }}
          animate={activity === 'walking' ? { rotate: [-15, 15, -15] } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
        <motion.div
          style={{
            position: 'absolute',
            top: 10,
            left: 5,
            width: 2,
            height: 4,
            background: COLORS.body,
          }}
          animate={activity === 'walking' ? { rotate: [15, -15, 15] } : {}}
          transition={{ duration: 0.3, repeat: Infinity }}
        />

        {/* Arms */}
        <motion.div
          style={{
            position: 'absolute',
            top: 4,
            left: -2,
            width: 3,
            height: 2,
            background: COLORS.vest,
            transformOrigin: 'right center',
          }}
          animate={
            activity === 'welding'
              ? { rotate: [-20, -30, -20] }
              : activity === 'working'
                ? { rotate: [-10, -40, -10] }
                : {}
          }
          transition={{ duration: 0.4, repeat: Infinity }}
        />
        <motion.div
          style={{
            position: 'absolute',
            top: 4,
            right: -2,
            width: 3,
            height: 2,
            background: COLORS.vest,
            transformOrigin: 'left center',
          }}
          animate={
            activity === 'welding'
              ? { rotate: [20, 30, 20] }
              : activity === 'working'
                ? { rotate: [10, 40, 10] }
                : {}
          }
          transition={{ duration: 0.4, repeat: Infinity }}
        />

        {/* Welding sparks */}
        {activity === 'welding' && <WeldingSparks />}
      </div>
    </motion.div>
  );
}

function WeldingSparks() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        angle: (i * 60 + Math.random() * 30) * (Math.PI / 180),
        distance: 8 + Math.random() * 6,
        delay: Math.random() * 0.3,
      })),
    [],
  );

  return (
    <div
      className="absolute"
      style={{
        left: -4,
        top: 4,
        width: 16,
        height: 16,
      }}
    >
      {sparks.map((spark) => (
        <motion.div
          key={spark.id}
          className="absolute"
          style={{
            left: 8,
            top: 8,
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: COLORS.weldSpark,
            boxShadow: `0 0 4px ${COLORS.weldSpark}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos(spark.angle) * spark.distance,
            y: Math.sin(spark.angle) * spark.distance,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 0.4,
            delay: spark.delay,
            repeat: Infinity,
            repeatDelay: 0.2,
          }}
        />
      ))}

      {/* Central welding flash */}
      <motion.div
        className="absolute"
        style={{
          left: 6,
          top: 6,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'white',
        }}
        animate={{
          opacity: [0.8, 1, 0.8],
          scale: [1, 1.3, 1],
          boxShadow: [
            '0 0 6px #fef08a, 0 0 12px #fbbf24',
            '0 0 10px #fef08a, 0 0 20px #fbbf24',
            '0 0 6px #fef08a, 0 0 12px #fbbf24',
          ],
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
        }}
      />
    </div>
  );
}

export default ConstructionWorkers;
