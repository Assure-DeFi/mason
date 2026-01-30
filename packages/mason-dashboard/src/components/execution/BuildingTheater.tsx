'use client';

/**
 * BuildingTheater - Construction-themed visual progress for execution
 *
 * Displays execution progress as building a structure floor by floor.
 * Each wave of execution adds a floor to the building.
 * Validation phase is shown as inspector review.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import { TABLES } from '@/lib/constants';

interface ExecutionProgress {
  id: string;
  item_id: string;
  run_id: string | null;
  current_phase: 'site_review' | 'foundation' | 'building' | 'inspection' | 'complete';
  current_wave: number;
  total_waves: number;
  wave_status: 'pending' | 'in_progress' | 'completed';
  current_task: string | null;
  tasks_completed: number;
  tasks_total: number;
  current_file: string | null;
  files_touched: string[];
  lines_changed: number;
  validation_typescript: 'pending' | 'running' | 'pass' | 'fail';
  validation_eslint: 'pending' | 'running' | 'pass' | 'fail';
  validation_build: 'pending' | 'running' | 'pass' | 'fail';
  validation_tests: 'pending' | 'running' | 'pass' | 'fail';
  inspector_findings: string[];
  fix_iteration: number;
  max_iterations: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

const PHASES = [
  { id: 'site_review', label: 'Site Review', icon: '📋', description: 'Surveying the codebase' },
  { id: 'foundation', label: 'Foundation', icon: '⛏️', description: 'Planning the build' },
  { id: 'building', label: 'Construction', icon: '🧱', description: 'Building floors' },
  { id: 'inspection', label: 'Inspection', icon: '🔍', description: 'Quality checks' },
  { id: 'complete', label: 'Certificate', icon: '📜', description: 'Ready to occupy!' },
] as const;

function getPhaseIndex(phase: string): number {
  return PHASES.findIndex((p) => p.id === phase);
}

interface BuildingTheaterProps {
  itemId: string;
  client: SupabaseClient | null;
  itemTitle?: string;
}

export function BuildingTheater({ itemId, client, itemTitle }: BuildingTheaterProps) {
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!client || !itemId) {
      setIsLoading(false);
      return;
    }

    // Capture client reference for use in async function
    const supabase = client;

    // Fetch initial progress
    async function fetchProgress() {
      const { data, error } = await supabase
        .from(TABLES.EXECUTION_PROGRESS)
        .select('*')
        .eq('item_id', itemId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected if execution hasn't started
      }

      if (data) {
        setProgress(data as ExecutionProgress);
      }
      setIsLoading(false);
    }

    void fetchProgress();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`building-${itemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.EXECUTION_PROGRESS,
          filter: `item_id=eq.${itemId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setProgress(null);
          } else {
            setProgress(payload.new as ExecutionProgress);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, itemId]);

  if (isLoading) {
    return <BuildingPlaceholder message="Loading progress..." />;
  }

  if (!progress) {
    return <BuildingPlaceholder message="Waiting for construction to begin..." />;
  }

  return (
    <div className="bg-navy border border-gray-700 rounded-lg p-6 min-h-[400px]">
      {/* Building Visualization */}
      <div className="flex justify-center mb-8">
        <BuildingVisualization
          totalFloors={progress.total_waves}
          currentFloor={progress.current_wave}
          phase={progress.current_phase}
        />
      </div>

      {/* Phase Progress */}
      <div className="space-y-3 mb-6">
        {PHASES.map((phase, i) => {
          const isComplete = getPhaseIndex(progress.current_phase) > i;
          const isCurrent = phase.id === progress.current_phase;

          return (
            <div
              key={phase.id}
              className={`flex items-center gap-3 p-2 rounded ${
                isCurrent ? 'bg-gold/10 border border-gold/30' : ''
              }`}
            >
              <span className="text-xl">{phase.icon}</span>
              <span
                className={
                  isComplete
                    ? 'text-green-400'
                    : isCurrent
                      ? 'text-gold'
                      : 'text-gray-500'
                }
              >
                {phase.label}
              </span>
              <span className="text-gray-500 text-sm hidden sm:inline">
                {phase.description}
              </span>
              <span className="ml-auto">
                {isComplete ? '✅' : isCurrent ? '⏳' : '○'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current Activity */}
      <div className="border-t border-gray-700 pt-4">
        <div className="text-sm text-gray-400 mb-1">Currently:</div>
        <div className="text-white font-medium">
          {progress.current_task || 'Preparing next step...'}
        </div>

        {progress.current_file && (
          <div className="text-sm text-gold mt-2 font-mono truncate">
            📝 {progress.current_file}
          </div>
        )}

        {progress.lines_changed > 0 && (
          <div className="text-sm text-gray-400">
            🧱 {progress.lines_changed} lines placed
          </div>
        )}

        {progress.tasks_total > 0 && (
          <div className="text-sm text-gray-400 mt-1">
            Tasks: {progress.tasks_completed}/{progress.tasks_total}
          </div>
        )}
      </div>

      {/* Inspector Section (during validation) */}
      {progress.current_phase === 'inspection' && (
        <InspectorPanel
          typescript={progress.validation_typescript}
          eslint={progress.validation_eslint}
          build={progress.validation_build}
          tests={progress.validation_tests}
          fixIteration={progress.fix_iteration}
          findings={progress.inspector_findings}
        />
      )}

      {/* Completion Certificate */}
      {progress.current_phase === 'complete' && (
        <OccupancyCertificate itemTitle={itemTitle || progress.current_task || 'Feature'} />
      )}
    </div>
  );
}

interface BuildingVisualizationProps {
  totalFloors: number;
  currentFloor: number;
  phase: string;
}

function BuildingVisualization({ totalFloors, currentFloor, phase }: BuildingVisualizationProps) {
  const floors = Math.max(totalFloors, 1);

  return (
    <div className="relative">
      {/* Construction crane for active building */}
      <AnimatePresence>
        {phase === 'building' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: [0, 5, 0, -5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-8 -right-4 text-2xl"
          >
            🏗️
          </motion.div>
        )}
      </AnimatePresence>

      {/* Building floors */}
      <div className="flex flex-col-reverse items-center">
        {Array.from({ length: floors }).map((_, i) => {
          const floorNum = i + 1;
          const isComplete = floorNum < currentFloor;
          const isCurrent = floorNum === currentFloor && phase === 'building';

          return (
            <motion.div
              key={floorNum}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isComplete || isCurrent ? 1 : 0.3,
                scale: 1,
              }}
              className={`
                border-2 text-center py-2 font-bold text-sm
                ${isComplete ? 'bg-gold/20 border-gold text-gold' : ''}
                ${isCurrent ? 'bg-gold/40 border-gold text-white animate-pulse' : ''}
                ${!isComplete && !isCurrent ? 'border-gray-700 text-gray-600' : ''}
              `}
              style={{ width: `${80 + (floors - floorNum) * 16}px` }}
            >
              {isCurrent && '🧱 '}Floor {floorNum}
            </motion.div>
          );
        })}

        {/* Foundation */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: phase !== 'site_review' ? 1 : 0.3,
          }}
          className={`
            border-2 py-3 px-6 font-bold mt-1 text-sm
            ${phase !== 'site_review' ? 'bg-gray-800 border-gray-600 text-white' : 'border-gray-700 text-gray-600'}
          `}
          style={{ width: `${80 + floors * 16}px` }}
        >
          ⛏️ FOUNDATION
        </motion.div>

        {/* Ground/Site */}
        <div className="text-gray-600 mt-1 text-xs tracking-widest">
          ░░░░░░░░░░░░░░░░░░░
        </div>
      </div>
    </div>
  );
}

interface InspectorPanelProps {
  typescript: string;
  eslint: string;
  build: string;
  tests: string;
  fixIteration: number;
  findings: string[];
}

function InspectorPanel({
  typescript,
  eslint,
  build,
  tests,
  fixIteration,
  findings,
}: InspectorPanelProps) {
  return (
    <div className="mt-6 border-t border-gray-700 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">👷</span>
        <span className="text-white font-medium">Inspector Review</span>
        {fixIteration > 0 && (
          <span className="text-yellow-500 text-sm">(Revision {fixIteration}/5)</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <InspectionBadge label="TypeScript" status={typescript} />
        <InspectionBadge label="ESLint" status={eslint} />
        <InspectionBadge label="Build" status={build} />
        <InspectionBadge label="Tests" status={tests} />
      </div>

      {findings && findings.length > 0 && (
        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
          <div className="text-yellow-400 text-sm font-medium mb-1">
            📋 Inspector Findings:
          </div>
          <ul className="text-sm text-yellow-200/80 list-disc list-inside space-y-1">
            {findings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface InspectionBadgeProps {
  label: string;
  status: string;
}

function InspectionBadge({ label, status }: InspectionBadgeProps) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    pending: { bg: 'bg-gray-800', text: 'text-gray-400', icon: '○' },
    running: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', icon: '🔍' },
    pass: { bg: 'bg-green-900/50', text: 'text-green-400', icon: '✅' },
    fail: { bg: 'bg-red-900/50', text: 'text-red-400', icon: '❌' },
  };

  const { bg, text, icon } = config[status] || config.pending;

  return (
    <div className={`${bg} ${text} px-2 py-2 rounded text-center text-xs sm:text-sm`}>
      <span className="mr-1">{icon}</span>
      {label}
    </div>
  );
}

interface OccupancyCertificateProps {
  itemTitle: string;
}

function OccupancyCertificate({ itemTitle }: OccupancyCertificateProps) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      className="mt-6 p-6 bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold rounded-lg text-center"
    >
      <div className="text-4xl mb-2">📜</div>
      <div className="text-gold font-bold text-lg">CERTIFICATE OF OCCUPANCY</div>
      <div className="text-white mt-2 truncate">{itemTitle}</div>
      <div className="text-gray-400 text-sm mt-2">
        All inspections passed. Ready to ship!
      </div>
      <div className="mt-4 text-green-400 font-medium">
        ✅ Rock Solid by Design
      </div>
    </motion.div>
  );
}

interface BuildingPlaceholderProps {
  message: string;
}

function BuildingPlaceholder({ message }: BuildingPlaceholderProps) {
  return (
    <div className="bg-navy border border-gray-700 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-2">🏗️</div>
        <div>{message}</div>
      </div>
    </div>
  );
}

export default BuildingTheater;
