'use client';

/**
 * SkyBackground - Dynamic sky with day/night cycle
 *
 * Transitions through:
 * - Dawn (site_review): Pink/orange gradient
 * - Morning (foundation): Light blue
 * - Midday (building early): Bright blue
 * - Afternoon (building late): Warm blue
 * - Golden Hour (inspection): Orange/gold
 * - Night (complete): Dark blue with stars
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

export interface SkyBackgroundProps {
  phase: 'site_review' | 'foundation' | 'building' | 'inspection' | 'complete';
  waveProgress?: number;
  className?: string;
}

const SKY_CONFIGS = {
  site_review: {
    gradient:
      'linear-gradient(180deg, #1e3a5f 0%, #4a3728 30%, #c9754b 60%, #f5a962 100%)',
    stars: false,
    sunPosition: 0.1,
    sunColor: '#ff8c42',
    cloudOpacity: 0.3,
  },
  foundation: {
    gradient: 'linear-gradient(180deg, #4a90c2 0%, #87ceeb 50%, #b0d4e8 100%)',
    stars: false,
    sunPosition: 0.3,
    sunColor: '#ffd700',
    cloudOpacity: 0.5,
  },
  building: {
    gradient: 'linear-gradient(180deg, #1e90ff 0%, #87ceeb 40%, #e0f0ff 100%)',
    stars: false,
    sunPosition: 0.5,
    sunColor: '#fff5b8',
    cloudOpacity: 0.6,
  },
  inspection: {
    gradient:
      'linear-gradient(180deg, #2d5a87 0%, #e8a855 40%, #f5c066 70%, #ffd993 100%)',
    stars: false,
    sunPosition: 0.8,
    sunColor: '#ff9500',
    cloudOpacity: 0.4,
  },
  complete: {
    gradient: 'linear-gradient(180deg, #0a0724 0%, #1a1a4e 40%, #2d2d6b 100%)',
    stars: true,
    sunPosition: 1.2,
    sunColor: '#e8e8f0',
    cloudOpacity: 0.1,
  },
};

export function SkyBackground({ phase, className = '' }: SkyBackgroundProps) {
  const config = SKY_CONFIGS[phase];

  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 60,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2,
      duration: Math.random() * 1 + 1.5,
    }));
  }, []);

  const celestialY = config.sunPosition * 100;
  const celestialX = 20 + config.sunPosition * 60;

  return (
    <motion.div
      className={`absolute inset-0 overflow-hidden ${className}`}
      animate={{ background: config.gradient }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      {/* Stars */}
      {config.stars && (
        <div className="absolute inset-0">
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                delay: star.delay,
                duration: star.duration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Sun/Moon */}
      <motion.div
        className="absolute"
        animate={{
          left: `${celestialX}%`,
          top: `${Math.max(5, Math.min(85, celestialY))}%`,
          opacity: config.sunPosition > 1 ? 0.9 : 1,
        }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        style={{
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Glow */}
        <motion.div
          className="absolute rounded-full"
          animate={{
            width: phase === 'complete' ? 30 : 60,
            height: phase === 'complete' ? 30 : 60,
            background:
              phase === 'complete'
                ? 'radial-gradient(circle, #e8e8f0 0%, #e8e8f020 70%, transparent 100%)'
                : `radial-gradient(circle, ${config.sunColor} 0%, ${config.sunColor}40 50%, transparent 100%)`,
          }}
          transition={{ duration: 1.5 }}
          style={{
            transform: 'translate(-50%, -50%)',
            left: '50%',
            top: '50%',
          }}
        />
        {/* Body */}
        <motion.div
          className="rounded-full"
          animate={{
            width: phase === 'complete' ? 20 : 30,
            height: phase === 'complete' ? 20 : 30,
            background: config.sunColor,
            boxShadow:
              phase === 'complete'
                ? `0 0 20px ${config.sunColor}60`
                : `0 0 40px ${config.sunColor}, 0 0 80px ${config.sunColor}60`,
          }}
          transition={{ duration: 1.5 }}
        />
        {/* Moon craters */}
        {phase === 'complete' && (
          <>
            <div
              className="absolute rounded-full bg-gray-300/20"
              style={{ width: 4, height: 4, top: 5, left: 6 }}
            />
            <div
              className="absolute rounded-full bg-gray-300/15"
              style={{ width: 6, height: 6, top: 10, left: 3 }}
            />
            <div
              className="absolute rounded-full bg-gray-300/20"
              style={{ width: 3, height: 3, top: 7, left: 12 }}
            />
          </>
        )}
      </motion.div>

      {/* Clouds */}
      <Clouds opacity={config.cloudOpacity} phase={phase} />

      {/* Horizon gradient overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)',
        }}
      />
    </motion.div>
  );
}

interface CloudsProps {
  opacity: number;
  phase: string;
}

function Clouds({ opacity, phase }: CloudsProps) {
  const clouds = useMemo(
    () => [
      { id: 1, startX: -20, y: 15, width: 80, height: 25, duration: 60 },
      { id: 2, startX: 30, y: 25, width: 100, height: 30, duration: 75 },
      { id: 3, startX: -40, y: 35, width: 60, height: 20, duration: 50 },
      { id: 4, startX: 60, y: 10, width: 70, height: 22, duration: 65 },
    ],
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {clouds.map((cloud) => (
        <motion.div
          key={cloud.id}
          className="absolute"
          style={{
            top: `${cloud.y}%`,
            width: cloud.width,
            height: cloud.height,
          }}
          initial={{ left: `${cloud.startX}%` }}
          animate={{
            left: [`${cloud.startX}%`, '120%'],
            opacity: opacity,
          }}
          transition={{
            left: {
              duration: cloud.duration,
              repeat: Infinity,
              ease: 'linear',
            },
            opacity: { duration: 1.5 },
          }}
        >
          <CloudShape
            width={cloud.width}
            height={cloud.height}
            isNight={phase === 'complete'}
          />
        </motion.div>
      ))}
    </div>
  );
}

interface CloudShapeProps {
  width: number;
  height: number;
  isNight: boolean;
}

function CloudShape({ width, height, isNight }: CloudShapeProps) {
  const color = isNight
    ? 'rgba(100, 100, 120, 0.4)'
    : 'rgba(255, 255, 255, 0.8)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <filter id="cloudBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>
      <g filter="url(#cloudBlur)">
        <ellipse
          cx={width * 0.3}
          cy={height * 0.6}
          rx={width * 0.25}
          ry={height * 0.35}
          fill={color}
        />
        <ellipse
          cx={width * 0.5}
          cy={height * 0.5}
          rx={width * 0.3}
          ry={height * 0.4}
          fill={color}
        />
        <ellipse
          cx={width * 0.7}
          cy={height * 0.6}
          rx={width * 0.25}
          ry={height * 0.35}
          fill={color}
        />
        <ellipse
          cx={width * 0.4}
          cy={height * 0.4}
          rx={width * 0.2}
          ry={height * 0.3}
          fill={color}
        />
        <ellipse
          cx={width * 0.6}
          cy={height * 0.4}
          rx={width * 0.2}
          ry={height * 0.3}
          fill={color}
        />
      </g>
    </svg>
  );
}

export default SkyBackground;
