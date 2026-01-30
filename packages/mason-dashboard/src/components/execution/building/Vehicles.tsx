'use client';

/**
 * Vehicles - Construction vehicles on the site
 *
 * Features:
 * - Cement mixer truck
 * - Flatbed delivery truck
 * - Vehicles animate arriving/leaving
 */

import { motion, AnimatePresence } from 'framer-motion';

export interface VehiclesProps {
  phase: 'site_review' | 'foundation' | 'building' | 'inspection' | 'complete';
}

const COLORS = {
  truckBody: '#dc2626',
  truckCab: '#ef4444',
  wheel: '#1f2937',
  wheelRim: '#6b7280',
  mixer: '#6b7280',
  mixerStripe: '#fbbf24',
  flatbed: '#78716c',
  material: '#92400e',
};

export function Vehicles({ phase }: VehiclesProps) {
  const showCementTruck = phase === 'foundation';
  const showDeliveryTruck = phase === 'building';
  const isComplete = phase === 'complete';

  return (
    <div
      className="absolute"
      style={{
        bottom: -25,
        left: -120,
        width: 400,
        height: 50,
        zIndex: 1,
      }}
    >
      {/* Cement mixer arrives during foundation */}
      <AnimatePresence>
        {showCementTruck && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 10,
              left: 20,
            }}
          >
            <CementTruck />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery truck during building phase */}
      <AnimatePresence>
        {showDeliveryTruck && (
          <motion.div
            initial={{ x: 250, opacity: 0 }}
            animate={{ x: 150, opacity: 1 }}
            exit={{ x: 350, opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: 10,
              left: 0,
            }}
          >
            <DeliveryTruck />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion: Cars in parking lot */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute"
          style={{ bottom: 10, right: 80 }}
        >
          <ParkingCar color="#3b82f6" />
        </motion.div>
      )}
    </div>
  );
}

function CementTruck() {
  return (
    <div className="relative" style={{ width: 70, height: 35 }}>
      {/* Cab */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 0,
          width: 20,
          height: 18,
          background: COLORS.truckCab,
          borderRadius: '4px 4px 0 0',
        }}
      >
        {/* Window */}
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 12,
            height: 8,
            background: '#87ceeb',
            opacity: 0.7,
            borderRadius: 2,
          }}
        />
      </div>

      {/* Mixer drum */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 22,
          width: 40,
          height: 24,
          background: `linear-gradient(180deg, ${COLORS.mixer} 0%, #52525b 100%)`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        {/* Spiral stripes */}
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent 0px,
              transparent 8px,
              ${COLORS.mixerStripe} 8px,
              ${COLORS.mixerStripe} 12px
            )`,
          }}
        />
      </motion.div>

      {/* Drum support */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 25,
          width: 4,
          height: 8,
          background: COLORS.truckBody,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 50,
          width: 4,
          height: 8,
          background: COLORS.truckBody,
        }}
      />

      {/* Chassis */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 0,
          width: 65,
          height: 6,
          background: COLORS.truckBody,
        }}
      />

      {/* Wheels */}
      <Wheel x={6} />
      <Wheel x={18} />
      <Wheel x={45} />
      <Wheel x={55} />
    </div>
  );
}

function DeliveryTruck() {
  return (
    <div className="relative" style={{ width: 60, height: 30 }}>
      {/* Cab */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: 0,
          width: 18,
          height: 16,
          background: COLORS.truckCab,
          borderRadius: '3px 3px 0 0',
        }}
      >
        {/* Window */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 12,
            height: 7,
            background: '#87ceeb',
            opacity: 0.7,
            borderRadius: 1,
          }}
        />
      </div>

      {/* Flatbed */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: 18,
          width: 38,
          height: 4,
          background: COLORS.flatbed,
        }}
      >
        {/* Side rails */}
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: 2,
            width: 2,
            height: 10,
            background: COLORS.flatbed,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: 2,
            width: 2,
            height: 10,
            background: COLORS.flatbed,
          }}
        />
      </div>

      {/* Materials on flatbed */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 22,
          width: 30,
          height: 12,
          background: `linear-gradient(180deg, ${COLORS.material} 0%, #78350f 100%)`,
          borderRadius: 2,
        }}
      />

      {/* Chassis */}
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: 0,
          width: 55,
          height: 5,
          background: COLORS.truckBody,
        }}
      />

      {/* Wheels */}
      <Wheel x={6} size={8} />
      <Wheel x={40} size={8} />
      <Wheel x={48} size={8} />
    </div>
  );
}

interface WheelProps {
  x: number;
  size?: number;
}

function Wheel({ x, size = 10 }: WheelProps) {
  return (
    <motion.div
      style={{
        position: 'absolute',
        bottom: 0,
        left: x,
        width: size,
        height: size,
        background: COLORS.wheel,
        borderRadius: '50%',
        border: `2px solid ${COLORS.wheelRim}`,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      {/* Hub */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: size * 0.3,
          height: size * 0.3,
          background: COLORS.wheelRim,
          borderRadius: '50%',
        }}
      />
    </motion.div>
  );
}

interface ParkingCarProps {
  color: string;
}

function ParkingCar({ color }: ParkingCarProps) {
  return (
    <div className="relative" style={{ width: 25, height: 12 }}>
      {/* Car body */}
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          left: 0,
          width: 25,
          height: 8,
          background: color,
          borderRadius: '3px 3px 1px 1px',
        }}
      />
      {/* Roof */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 5,
          width: 14,
          height: 5,
          background: color,
          borderRadius: '3px 3px 0 0',
        }}
      >
        {/* Windows */}
        <div
          style={{
            position: 'absolute',
            top: 1,
            left: 2,
            width: 10,
            height: 3,
            background: '#87ceeb',
            opacity: 0.6,
            borderRadius: 1,
          }}
        />
      </div>
      {/* Wheels */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 3,
          width: 5,
          height: 5,
          background: '#1f2937',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 3,
          width: 5,
          height: 5,
          background: '#1f2937',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

export default Vehicles;
