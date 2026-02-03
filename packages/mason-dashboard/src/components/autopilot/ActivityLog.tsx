'use client';

import {
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Play,
  GitPullRequest,
  SkipForward,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';

interface AutopilotRun {
  id: string;
  run_type: 'analysis' | 'execution';
  status: 'running' | 'completed' | 'failed' | 'skipped';
  items_analyzed: number;
  items_auto_approved: number;
  items_executed: number;
  prs_created: number;
  error_message: string | null;
  skip_reason: string | null;
  started_at: string;
  completed_at: string | null;
}

interface Props {
  repositoryId: string | null;
}

export function ActivityLog({ repositoryId }: Props) {
  const { client } = useUserDatabase();
  const [runs, setRuns] = useState<AutopilotRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRuns() {
      if (!client || !repositoryId) {
        setLoading(false);
        return;
      }

      const { data, error } = await client
        .from(TABLES.AUTOPILOT_RUNS)
        .select('*')
        .eq('repository_id', repositoryId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setRuns(data as AutopilotRun[]);
      }

      setLoading(false);
    }

    void loadRuns();

    // Set up realtime subscription
    if (client && repositoryId) {
      const channel = client
        .channel('autopilot-runs')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: TABLES.AUTOPILOT_RUNS,
            filter: `repository_id=eq.${repositoryId}`,
          },
          () => {
            // Reload runs on any change
            void loadRuns();
          },
        )
        .subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    }
  }, [client, repositoryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!repositoryId) {
    return (
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6 text-center text-gray-400">
        Select a repository to view activity log.
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-black/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900">
          <Search className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-gray-400">No autopilot runs yet.</p>
        <p className="mt-1 text-sm text-gray-500">
          Runs will appear here once autopilot is enabled and triggered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  );
}

function RunCard({ run }: { run: AutopilotRun }) {
  const startTime = new Date(run.started_at);
  const endTime = run.completed_at ? new Date(run.completed_at) : null;
  const duration = endTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    : null;

  const StatusIcon = {
    running: Loader2,
    completed: CheckCircle,
    failed: XCircle,
    skipped: SkipForward,
  }[run.status];

  const statusColor = {
    running: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    skipped: 'text-yellow-400',
  }[run.status];

  const TypeIcon = run.run_type === 'analysis' ? Search : Play;

  return (
    <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gray-900 p-2">
            <TypeIcon className="h-4 w-4 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize text-white">
                {run.run_type}
              </span>
              <StatusIcon
                className={`h-4 w-4 ${statusColor} ${run.status === 'running' ? 'animate-spin' : ''}`}
              />
            </div>
            <p className="text-sm text-gray-400">
              {startTime.toLocaleDateString()}{' '}
              {startTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {duration !== null && (
                <span className="ml-2">({formatDuration(duration)})</span>
              )}
            </p>
          </div>
        </div>

        <div className="text-right text-sm">
          {run.run_type === 'analysis' ? (
            <div className="space-y-0.5">
              <div className="text-gray-400">
                <span className="text-white">{run.items_analyzed}</span> items
                analyzed
              </div>
              <div className="text-gray-400">
                <span className="text-green-400">
                  {run.items_auto_approved}
                </span>{' '}
                auto-approved
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-gray-400">
                <span className="text-white">{run.items_executed}</span> items
                executed
              </div>
              {run.prs_created > 0 && (
                <div className="flex items-center justify-end gap-1 text-gray-400">
                  <GitPullRequest className="h-3 w-3" />
                  <span className="text-gold">{run.prs_created}</span> PRs
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {run.error_message && (
        <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <p className="text-sm text-red-400">{run.error_message}</p>
        </div>
      )}

      {run.skip_reason && (
        <div className="mt-3 rounded-lg border border-yellow-900/50 bg-yellow-950/30 p-3">
          <p className="text-sm text-yellow-400">{run.skip_reason}</p>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
