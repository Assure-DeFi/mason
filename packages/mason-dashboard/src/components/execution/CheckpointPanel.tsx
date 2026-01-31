'use client';

/**
 * CheckpointPanel - Checkpoint Timeline Progress Display
 *
 * Replaces the unreliable log panel with a beautiful checkpoint timeline.
 * Shows structured progress through execution milestones with:
 * - Progress bar with percentage
 * - Vertical checkpoint timeline with status icons
 * - Current file card showing active work
 * - Elapsed time counter
 */

import { motion } from 'framer-motion';
import { Check, Circle, Loader2, FileCode } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export interface Checkpoint {
  id: number;
  name: string;
  completed_at: string | null;
}

export interface CheckpointPanelProps {
  checkpointsCompleted: Checkpoint[];
  currentCheckpointIndex: number;
  totalCheckpoints: number;
  currentCheckpointMessage: string | null;
  currentFile: string | null;
  linesChanged: number;
  startedAt: string;
  isComplete: boolean;
}

export function CheckpointPanel({
  checkpointsCompleted,
  currentCheckpointIndex,
  totalCheckpoints,
  currentCheckpointMessage,
  currentFile,
  linesChanged,
  startedAt,
  isComplete,
}: CheckpointPanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Elapsed time counter
  useEffect(() => {
    if (isComplete) {
      return;
    }

    const startTime = new Date(startedAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isComplete]);

  // Auto-scroll to current checkpoint
  useEffect(() => {
    if (timelineRef.current) {
      const currentElement = timelineRef.current.querySelector(
        '[data-current="true"]',
      );
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentCheckpointIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage (avoid division by zero)
  const percentage =
    totalCheckpoints > 0
      ? Math.min(
          100,
          Math.round((checkpointsCompleted.length / totalCheckpoints) * 100),
        )
      : 0;

  // Build checkpoint list for display
  const displayCheckpoints = buildDisplayCheckpoints(
    checkpointsCompleted,
    currentCheckpointIndex,
    currentCheckpointMessage,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-700 bg-navy/80">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <Check className="h-5 w-5 text-green-400" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          )}
          <span className="font-semibold text-white">
            {isComplete ? 'COMPLETE' : 'MASON AT WORK'}
          </span>
        </div>
        <div className="font-mono text-sm text-gray-400">
          {formatTime(elapsedSeconds)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <motion.div
            className="h-full bg-gold"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Checkpoint Timeline */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-y-auto px-4 py-2"
        style={{ maxHeight: '280px' }}
      >
        <div className="space-y-1">
          {displayCheckpoints.map((checkpoint, idx) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              isLast={idx === displayCheckpoints.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Current File Card */}
      {currentFile && !isComplete && (
        <div className="border-t border-gray-700 p-4">
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
              <FileCode className="h-3 w-3" />
              <span>Currently:</span>
            </div>
            <div className="truncate font-mono text-sm text-gold">
              {currentFile}
            </div>
            {linesChanged > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {linesChanged} lines changed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DisplayCheckpoint {
  id: number;
  name: string;
  status: 'completed' | 'current' | 'pending';
  completedAt: string | null;
}

function buildDisplayCheckpoints(
  completed: Checkpoint[],
  currentIndex: number,
  currentMessage: string | null,
): DisplayCheckpoint[] {
  const result: DisplayCheckpoint[] = [];

  // Add all completed checkpoints
  for (const cp of completed) {
    result.push({
      id: cp.id,
      name: cp.name,
      status: 'completed',
      completedAt: cp.completed_at,
    });
  }

  // Add current checkpoint if not already in completed
  if (
    currentMessage &&
    currentIndex > 0 &&
    !completed.some((c) => c.id === currentIndex)
  ) {
    result.push({
      id: currentIndex,
      name: currentMessage,
      status: 'current',
      completedAt: null,
    });
  }

  // Sort by ID to maintain order
  result.sort((a, b) => a.id - b.id);

  return result;
}

interface CheckpointItemProps {
  checkpoint: DisplayCheckpoint;
  isLast: boolean;
}

function CheckpointItem({ checkpoint, isLast }: CheckpointItemProps) {
  const { status, name, completedAt } = checkpoint;

  const formatTimestamp = (ts: string | null) => {
    if (!ts) {
      return '';
    }
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-start gap-3" data-current={status === 'current'}>
      {/* Icon */}
      <div className="flex flex-col items-center">
        {status === 'completed' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-900/50">
            <Check className="h-3 w-3 text-green-400" />
          </div>
        )}
        {status === 'current' && (
          <motion.div
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gold bg-gold/20"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Circle className="h-2 w-2 fill-gold text-gold" />
          </motion.div>
        )}
        {status === 'pending' && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-600 bg-gray-800">
            <Circle className="h-2 w-2 text-gray-600" />
          </div>
        )}
        {/* Connecting line */}
        {!isLast && (
          <div
            className={`mt-1 h-4 w-0.5 ${
              status === 'completed' ? 'bg-green-700/50' : 'bg-gray-700'
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div
          className={`text-sm ${
            status === 'completed'
              ? 'text-gray-300'
              : status === 'current'
                ? 'font-medium text-white'
                : 'text-gray-500'
          }`}
        >
          {name}
        </div>
        {status === 'completed' && completedAt && (
          <div className="text-xs text-gray-500">
            {formatTimestamp(completedAt)}
          </div>
        )}
        {status === 'current' && <div className="text-xs text-gold">NOW</div>}
      </div>
    </div>
  );
}

export default CheckpointPanel;
