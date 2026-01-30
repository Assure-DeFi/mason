'use client';

/**
 * ParticleSystem - Construction particles and effects
 *
 * Features:
 * - Welding sparks
 * - Concrete dust during foundation
 * - Debris during building
 * - Confetti on completion
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

export interface ParticleSystemProps {
  phase: 'site_review' | 'foundation' | 'building' | 'inspection' | 'complete';
  currentFloor: number;
  totalFloors: number;
  isComplete: boolean;
}

const FLOOR_HEIGHT = 28;

export function ParticleSystem({
  phase,
  currentFloor,
  isComplete,
}: ParticleSystemProps) {
  const bottomOffset = 34 + (currentFloor - 1) * FLOOR_HEIGHT;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Construction dust during foundation */}
      {phase === 'foundation' && <DustParticles y={40} />}

      {/* Building debris/sparks */}
      {phase === 'building' && <DebrisParticles y={bottomOffset + 20} />}

      {/* Completion confetti */}
      <AnimatePresence>{isComplete && <ConfettiExplosion />}</AnimatePresence>

      {/* Rain during building (adds atmosphere) */}
      {(phase === 'building' || phase === 'foundation') && (
        <RainEffect intensity={phase === 'foundation' ? 0.3 : 0.15} />
      )}
    </div>
  );
}

interface DustParticlesProps {
  y: number;
}

function DustParticles({ y }: DustParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        x: 40 + Math.random() * 40,
        delay: Math.random() * 2,
        duration: 1 + Math.random() * 1,
        size: 3 + Math.random() * 4,
      })),
    [],
  );

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: y,
            width: p.size,
            height: p.size,
            background: 'rgba(120, 113, 108, 0.6)',
          }}
          initial={{ y: 0, opacity: 0.8 }}
          animate={{
            y: [-10, -30, -50],
            x: [0, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 50],
            opacity: [0.8, 0.5, 0],
            scale: [1, 1.5, 2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
        />
      ))}
    </>
  );
}

interface DebrisParticlesProps {
  y: number;
}

function DebrisParticles({ y }: DebrisParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        x: 30 + Math.random() * 40,
        delay: Math.random() * 1.5,
        duration: 0.8 + Math.random() * 0.4,
        type: Math.random() > 0.5 ? 'spark' : 'debris',
      })),
    [],
  );

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: y,
            width: p.type === 'spark' ? 3 : 4,
            height: p.type === 'spark' ? 3 : 4,
            background:
              p.type === 'spark' ? '#fbbf24' : 'rgba(107, 114, 128, 0.8)',
            borderRadius: p.type === 'spark' ? '50%' : '1px',
            boxShadow: p.type === 'spark' ? '0 0 4px #fbbf24' : 'none',
          }}
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: p.type === 'spark' ? [0, -20, -10] : [0, 30, 60],
            x: (Math.random() - 0.5) * 40,
            opacity: [1, 0.8, 0],
            rotate: p.type === 'debris' ? [0, 180, 360] : 0,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      ))}
    </>
  );
}

function ConfettiExplosion() {
  const confetti = useMemo(
    () =>
      Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        color: ['#E2D243', '#fbbf24', '#f97316', '#ef4444', '#3b82f6'][
          Math.floor(Math.random() * 5)
        ],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
        endX: (Math.random() - 0.5) * 200,
        endY: 100 + Math.random() * 150,
        rotation: Math.random() * 720 - 360,
        size: 4 + Math.random() * 6,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0"
    >
      {confetti.map((c) => (
        <motion.div
          key={c.id}
          className="absolute"
          style={{
            left: `${c.x}%`,
            top: '30%',
            width: c.size,
            height: c.shape === 'rect' ? c.size * 0.6 : c.size,
            background: c.color,
            borderRadius: c.shape === 'circle' ? '50%' : '1px',
            boxShadow: `0 0 4px ${c.color}40`,
          }}
          initial={{ y: 0, x: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: c.endY,
            x: c.endX,
            opacity: [1, 1, 0],
            rotate: c.rotation,
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}

      {/* Burst effect at center */}
      <motion.div
        className="absolute"
        style={{
          left: '50%',
          top: '35%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: [0, 2, 3], opacity: [1, 0.5, 0] }}
        transition={{ duration: 0.6 }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            background:
              'radial-gradient(circle, #E2D243 0%, #E2D24340 50%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

interface RainEffectProps {
  intensity: number;
}

function RainEffect({ intensity }: RainEffectProps) {
  const drops = useMemo(
    () =>
      Array.from({ length: Math.floor(30 * intensity) }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 0.5 + Math.random() * 0.3,
        height: 8 + Math.random() * 8,
      })),
    [intensity],
  );

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30">
      {drops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute"
          style={{
            left: `${drop.x}%`,
            top: -20,
            width: 1,
            height: drop.height,
            background:
              'linear-gradient(180deg, transparent 0%, rgba(148, 163, 184, 0.6) 100%)',
          }}
          animate={{
            y: [0, 400],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: drop.duration,
            delay: drop.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

export default ParticleSystem;
