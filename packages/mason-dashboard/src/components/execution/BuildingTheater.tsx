'use client';

/**
 * BuildingTheater - Construction-themed visual progress for execution
 *
 * A viral-worthy construction visualization that shows execution progress
 * as building a structure floor by floor with:
 * - Isometric 3D building with bottom-up construction
 * - Dynamic sky with day/night cycle
 * - Animated crane and scaffolding
 * - Construction workers and vehicles
 * - Particle effects (sparks, dust, confetti)
 * - Epic completion celebration
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

import { TABLES } from '@/lib/constants';

import {
  IsometricBuilding,
  SkyBackground,
  CraneAnimation,
  Scaffolding,
  GroundLevel,
  ConstructionWorkers,
  Vehicles,
  ParticleSystem,
  CompletionCelebration,
} from './building';

interface Checkpoint {
  id: number;
  name: string;
  completed_at: string | null;
}

interface ExecutionProgress {
  id: string;
  item_id: string;
  run_id: string | null;
  current_phase:
    | 'site_review'
    | 'foundation'
    | 'building'
    | 'inspection'
    | 'complete';
  current_wave: number;
  total_waves: number;
  wave_status: 'pending' | 'in_progress' | 'completed';
  current_task: string | null;
  tasks_completed: number;
  tasks_total: number;
  // Checkpoint-based progress tracking
  checkpoint_index: number;
  checkpoint_total: number;
  checkpoint_message: string | null;
  checkpoints_completed: Checkpoint[];
  // File-level progress
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

/**
 * Derive building floor progress from checkpoint data.
 * Maps checkpoint completion to building floors for visualization.
 */
function deriveBuildingProgress(progress: ExecutionProgress): {
  currentFloor: number;
  totalFloors: number;
} {
  // Use checkpoint data if available
  if (progress.checkpoint_total > 0) {
    const completed = progress.checkpoints_completed?.length ?? 0;
    // Map checkpoints to 4 floors (foundation, building x2, roof)
    const totalFloors = 4;
    const percentage = completed / progress.checkpoint_total;
    const currentFloor = Math.min(
      totalFloors,
      Math.floor(percentage * totalFloors) + (percentage > 0 ? 1 : 0),
    );
    return { currentFloor, totalFloors };
  }

  // Fallback to legacy wave system
  return {
    currentFloor: progress.current_wave,
    totalFloors: progress.total_waves,
  };
}

const PHASES = [
  {
    id: 'site_review',
    label: 'Site Review',
    description: 'Surveying the codebase',
  },
  { id: 'foundation', label: 'Foundation', description: 'Planning the build' },
  { id: 'building', label: 'Construction', description: 'Building floors' },
  { id: 'inspection', label: 'Inspection', description: 'Quality checks' },
  { id: 'complete', label: 'Certificate', description: 'Ready to occupy!' },
] as const;

function getPhaseIndex(phase: string): number {
  return PHASES.findIndex((p) => p.id === phase);
}

interface BuildingTheaterProps {
  itemId: string;
  client: SupabaseClient | null;
  itemTitle?: string;
}

export function BuildingTheater({
  itemId,
  client,
  itemTitle,
}: BuildingTheaterProps) {
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightsOn, setLightsOn] = useState(false);

  // Turn on lights when building is complete
  useEffect(() => {
    if (progress?.current_phase === 'complete') {
      const timer = setTimeout(() => setLightsOn(true), 1000);
      return () => clearTimeout(timer);
    }
    setLightsOn(false);
  }, [progress?.current_phase]);

  useEffect(() => {
    if (!client || !itemId) {
      console.log(
        '[BuildingTheater] Not starting (client:',
        !!client,
        'itemId:',
        itemId,
        ')',
      );
      setIsLoading(false);
      return;
    }

    const supabase = client;
    console.log('[BuildingTheater] Initializing for item:', itemId);

    async function fetchProgress() {
      console.log(
        '[BuildingTheater] Fetching initial progress for item:',
        itemId,
      );
      const { data, error } = await supabase
        .from(TABLES.EXECUTION_PROGRESS)
        .select('*')
        .eq('item_id', itemId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(
          '[BuildingTheater] Error fetching progress:',
          error.message,
        );
      }

      if (data) {
        console.log(
          '[BuildingTheater] Got initial progress - phase:',
          data.current_phase,
        );
        setProgress(data as ExecutionProgress);
      } else {
        console.log('[BuildingTheater] No progress record found yet');
      }
      setIsLoading(false);
    }

    void fetchProgress();

    console.log(
      '[BuildingTheater] Setting up realtime subscription for item:',
      itemId,
    );
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
          console.log('[BuildingTheater] Realtime event:', payload.eventType);
          if (payload.eventType === 'DELETE') {
            console.log('[BuildingTheater] Progress deleted');
            setProgress(null);
          } else {
            const newProgress = payload.new as ExecutionProgress;
            console.log(
              '[BuildingTheater] Progress update - phase:',
              newProgress.current_phase,
              'wave:',
              newProgress.current_wave,
            );
            setProgress(newProgress);
          }
        },
      )
      .subscribe((status) => {
        console.log('[BuildingTheater] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log(
            '[BuildingTheater] ✓ Realtime CONNECTED for item:',
            itemId,
          );
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[BuildingTheater] ⚠ Realtime FAILED for item:', itemId);
        }
      });

    return () => {
      console.log(
        '[BuildingTheater] Cleaning up subscription for item:',
        itemId,
      );
      void supabase.removeChannel(channel);
    };
  }, [client, itemId]);

  const handleReplay = useCallback(() => {
    // Reset lights for replay effect
    setLightsOn(false);
    setTimeout(() => setLightsOn(true), 500);
  }, []);

  if (isLoading) {
    return <BuildingPlaceholder message="Loading progress..." />;
  }

  if (!progress) {
    return (
      <BuildingPlaceholder message="Waiting for construction to begin..." />
    );
  }

  const phase = progress.current_phase;
  const isComplete = phase === 'complete';
  const isBuilding = phase === 'building';

  // Derive floor progress from checkpoints (or fallback to legacy waves)
  const { currentFloor, totalFloors } = deriveBuildingProgress(progress);

  return (
    <div className="bg-navy border border-gray-700 rounded-lg overflow-hidden">
      {/* Main visualization area */}
      <div className="relative h-[350px] overflow-hidden">
        {/* Sky background with day/night cycle */}
        <SkyBackground phase={phase} />

        {/* Construction scene container */}
        <div className="absolute inset-0 flex items-end justify-center pb-16">
          {/* Main building */}
          <div className="relative">
            {/* Crane */}
            <CraneAnimation
              isActive={isBuilding}
              currentFloor={currentFloor}
              totalFloors={totalFloors}
            />

            {/* Scaffolding on current floor */}
            <Scaffolding
              currentFloor={currentFloor}
              totalFloors={totalFloors}
              isVisible={isBuilding}
            />

            {/* The building itself */}
            <IsometricBuilding
              totalFloors={totalFloors}
              currentFloor={currentFloor}
              phase={phase}
              lightsOn={lightsOn}
            />

            {/* Workers */}
            <ConstructionWorkers
              currentFloor={currentFloor}
              totalFloors={totalFloors}
              phase={phase}
            />
          </div>
        </div>

        {/* Ground level elements */}
        <div className="absolute bottom-0 left-0 right-0">
          <GroundLevel phase={phase} />
          <Vehicles phase={phase} />
        </div>

        {/* Particle effects */}
        <ParticleSystem
          phase={phase}
          currentFloor={currentFloor}
          totalFloors={totalFloors}
          isComplete={isComplete}
        />

        {/* Completion celebration overlay */}
        <CompletionCelebration
          itemTitle={itemTitle || progress.current_task || 'Feature'}
          isComplete={isComplete}
          onReplay={handleReplay}
        />
      </div>

      {/* Progress info panel */}
      <div className="p-4 border-t border-gray-700 bg-navy/80">
        {/* Phase progress */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {PHASES.map((phaseItem, i) => {
            const isPhaseComplete = getPhaseIndex(progress.current_phase) > i;
            const isCurrent = phaseItem.id === progress.current_phase;

            return (
              <motion.div
                key={phaseItem.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  isPhaseComplete
                    ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                    : isCurrent
                      ? 'bg-gold/20 text-gold border border-gold/50'
                      : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}
                animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span>{isPhaseComplete ? '✓' : isCurrent ? '●' : '○'}</span>
                <span>{phaseItem.label}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Current activity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Currently:</div>
            {progress.tasks_total > 0 && (
              <div className="text-xs text-gray-500">
                {progress.tasks_completed}/{progress.tasks_total} tasks
              </div>
            )}
          </div>
          <div className="text-white font-medium truncate">
            {progress.current_task || 'Preparing next step...'}
          </div>

          {progress.current_file && (
            <div className="text-sm text-gold font-mono truncate flex items-center gap-1">
              <span className="text-gray-500">file:</span>
              {progress.current_file}
            </div>
          )}

          {progress.lines_changed > 0 && (
            <div className="text-xs text-gray-400">
              {progress.lines_changed} lines modified
            </div>
          )}
        </div>

        {/* Inspector section during validation */}
        {phase === 'inspection' && (
          <InspectorPanel
            typescript={progress.validation_typescript}
            eslint={progress.validation_eslint}
            build={progress.validation_build}
            tests={progress.validation_tests}
            fixIteration={progress.fix_iteration}
            findings={progress.inspector_findings}
          />
        )}
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
    <div className="mt-4 pt-4 border-t border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white font-medium">Inspector Review</span>
        {fixIteration > 0 && (
          <span className="text-yellow-500 text-xs">
            (Revision {fixIteration}/5)
          </span>
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
            Inspector Findings:
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
    running: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', icon: '◌' },
    pass: { bg: 'bg-green-900/50', text: 'text-green-400', icon: '✓' },
    fail: { bg: 'bg-red-900/50', text: 'text-red-400', icon: '✗' },
  };

  const { bg, text, icon } = config[status] || config.pending;

  return (
    <motion.div
      className={`${bg} ${text} px-2 py-2 rounded text-center text-xs sm:text-sm`}
      animate={status === 'running' ? { opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </motion.div>
  );
}

interface BuildingPlaceholderProps {
  message: string;
}

function BuildingPlaceholder({ message }: BuildingPlaceholderProps) {
  return (
    <div className="bg-navy border border-gray-700 rounded-lg overflow-hidden">
      <div className="h-[350px] flex items-center justify-center relative">
        {/* Placeholder sky */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, #1e3a5f 0%, #4a3728 30%, #c9754b 60%, #f5a962 100%)',
          }}
        />
        {/* Message */}
        <div className="relative text-center text-gray-400 z-10">
          <motion.div
            className="text-4xl mb-4"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🏗️
          </motion.div>
          <div>{message}</div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-700 bg-navy/80">
        <div className="h-8 bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default BuildingTheater;
