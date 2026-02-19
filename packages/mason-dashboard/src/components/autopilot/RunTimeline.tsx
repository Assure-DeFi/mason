'use client';

import {
  Activity,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Play,
  TrendingUp,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

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

interface AutopilotConfig {
  guardian_rails: {
    maxItemsPerDay: number;
    pauseOnFailure: boolean;
  } | null;
  schedule_cron: string | null;
  execution_window: {
    startHour: number;
    endHour: number;
  } | null;
  last_heartbeat: string | null;
}

interface Props {
  repositoryId: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-blue-400',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  completed: 'text-green-400',
  running: 'text-blue-400',
  failed: 'text-red-400',
  skipped: 'text-yellow-400',
};

export function RunTimeline({ repositoryId }: Props) {
  const { client } = useUserDatabase();
  const [runs, setRuns] = useState<AutopilotRun[]>([]);
  const [config, setConfig] = useState<AutopilotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredRun, setHoveredRun] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!client || !repositoryId) {
        setLoading(false);
        return;
      }

      const [runsResult, configResult] = await Promise.all([
        client
          .from(TABLES.AUTOPILOT_RUNS)
          .select('*')
          .eq('repository_id', repositoryId)
          .order('started_at', { ascending: false })
          .limit(50),
        client
          .from(TABLES.AUTOPILOT_CONFIG)
          .select(
            'guardian_rails,schedule_cron,execution_window,last_heartbeat',
          )
          .eq('repository_id', repositoryId)
          .single(),
      ]);

      if (!runsResult.error && runsResult.data) {
        setRuns(runsResult.data as AutopilotRun[]);
      }
      if (!configResult.error && configResult.data) {
        setConfig(configResult.data as AutopilotConfig);
      }

      setLoading(false);
    }

    void loadData();

    if (client && repositoryId) {
      const channel = client
        .channel('autopilot-timeline')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: TABLES.AUTOPILOT_RUNS,
            filter: `repository_id=eq.${repositoryId}`,
          },
          () => {
            void loadData();
          },
        )
        .subscribe();

      return () => {
        void client.removeChannel(channel);
      };
    }
  }, [client, repositoryId]);

  const stats = useMemo(() => {
    if (runs.length === 0) {
      return null;
    }

    const last7Days = runs.filter((r) => {
      const d = new Date(r.started_at);
      return d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    });

    const completed = last7Days.filter((r) => r.status === 'completed');
    const failed = last7Days.filter((r) => r.status === 'failed');
    const total = last7Days.length;
    const successRate = total > 0 ? (completed.length / total) * 100 : 0;

    const avgDuration =
      completed.length > 0
        ? completed.reduce((acc, r) => {
            if (!r.completed_at) {
              return acc;
            }
            return (
              acc +
              (new Date(r.completed_at).getTime() -
                new Date(r.started_at).getTime()) /
                1000
            );
          }, 0) / completed.length
        : 0;

    const totalItemsExecuted = last7Days.reduce(
      (acc, r) => acc + r.items_executed,
      0,
    );
    const totalPRs = last7Days.reduce((acc, r) => acc + r.prs_created, 0);

    return {
      totalRuns: total,
      successRate,
      failedCount: failed.length,
      avgDuration,
      totalItemsExecuted,
      totalPRs,
    };
  }, [runs]);

  // Group runs by day for the timeline
  const dayGroups = useMemo(() => {
    const groups: Record<
      string,
      { date: Date; runs: AutopilotRun[]; dayLabel: string }
    > = {};

    // Show last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split('T')[0];
      const dayLabel =
        i === 0
          ? 'Today'
          : i === 1
            ? 'Yesterday'
            : d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
      groups[key] = { date: d, runs: [], dayLabel };
    }

    for (const run of runs) {
      const key = new Date(run.started_at).toISOString().split('T')[0];
      if (groups[key]) {
        groups[key].runs.push(run);
      }
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v);
  }, [runs]);

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
        Select a repository to view the run timeline.
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-black/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-900">
          <Activity className="h-6 w-6 text-gray-500" />
        </div>
        <p className="text-gray-400">No run history yet.</p>
        <p className="mt-1 text-sm text-gray-500">
          Enable autopilot and runs will appear on this timeline.
        </p>
      </div>
    );
  }

  const maxItemsPerDay = config?.guardian_rails?.maxItemsPerDay ?? 10;

  return (
    <div className="space-y-6">
      {/* Health Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HealthCard
            label="Success Rate"
            value={`${Math.round(stats.successRate)}%`}
            icon={<CheckCircle className="h-4 w-4" />}
            status={
              stats.successRate >= 80
                ? 'good'
                : stats.successRate >= 50
                  ? 'warning'
                  : 'bad'
            }
          />
          <HealthCard
            label="Runs (7d)"
            value={String(stats.totalRuns)}
            icon={<Activity className="h-4 w-4" />}
            status="neutral"
          />
          <HealthCard
            label="Avg Duration"
            value={formatDuration(stats.avgDuration)}
            icon={<Clock className="h-4 w-4" />}
            status="neutral"
          />
          <HealthCard
            label="Items Executed"
            value={String(stats.totalItemsExecuted)}
            icon={<TrendingUp className="h-4 w-4" />}
            sublabel={stats.totalPRs > 0 ? `${stats.totalPRs} PRs` : undefined}
            status="neutral"
          />
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-lg border border-gray-800 bg-black/50">
        <div className="border-b border-gray-800 px-4 py-3">
          <h3 className="text-sm font-medium text-white">
            Run Timeline (Last 7 Days)
          </h3>
        </div>

        <div className="divide-y divide-gray-800/50">
          {dayGroups.map((group) => (
            <DayRow
              key={group.dayLabel}
              dayLabel={group.dayLabel}
              runs={group.runs}
              maxItemsPerDay={maxItemsPerDay}
              hoveredRun={hoveredRun}
              onHoverRun={setHoveredRun}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-800 px-4 py-2.5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
            Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
            Failed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" />
            Running
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-500" />
            Skipped
          </span>
          <span className="ml-auto text-gray-600">
            Daily limit: {maxItemsPerDay}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function HealthCard({
  label,
  value,
  icon,
  sublabel,
  status,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sublabel?: string;
  status: 'good' | 'warning' | 'bad' | 'neutral';
}) {
  const borderColors: Record<string, string> = {
    good: 'border-green-900/50',
    warning: 'border-yellow-900/50',
    bad: 'border-red-900/50',
    neutral: 'border-gray-800',
  };
  const iconColors: Record<string, string> = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    bad: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <div
      className={`rounded-lg border bg-black/50 p-3 ${borderColors[status]}`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className={iconColors[status]}>{icon}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-lg font-semibold text-white">{value}</div>
      {sublabel && <div className="text-xs text-gray-500">{sublabel}</div>}
    </div>
  );
}

function DayRow({
  dayLabel,
  runs,
  maxItemsPerDay,
  hoveredRun,
  onHoverRun,
}: {
  dayLabel: string;
  runs: AutopilotRun[];
  maxItemsPerDay: number;
  hoveredRun: string | null;
  onHoverRun: (id: string | null) => void;
}) {
  // Calculate total items executed for this day (for the daily limit bar)
  const totalExecuted = runs.reduce((acc, r) => acc + r.items_executed, 0);
  const limitPct = Math.min((totalExecuted / maxItemsPerDay) * 100, 100);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Day label */}
      <div className="w-20 shrink-0 text-xs text-gray-500">{dayLabel}</div>

      {/* Timeline bars */}
      <div className="relative flex min-h-[32px] flex-1 items-center gap-1">
        {runs.length === 0 ? (
          <span className="text-xs text-gray-700">No runs</span>
        ) : (
          runs.map((run) => (
            <RunBar
              key={run.id}
              run={run}
              hoveredRun={hoveredRun}
              onHoverRun={onHoverRun}
            />
          ))
        )}
      </div>

      {/* Daily limit indicator */}
      <div className="w-16 shrink-0">
        <div className="h-1.5 rounded-full bg-gray-800">
          <div
            className={`h-1.5 rounded-full transition-all ${
              limitPct >= 100
                ? 'bg-red-500'
                : limitPct >= 75
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${limitPct}%` }}
          />
        </div>
        <div className="mt-0.5 text-right text-[10px] text-gray-600">
          {totalExecuted}/{maxItemsPerDay}
        </div>
      </div>
    </div>
  );
}

function RunBar({
  run,
  hoveredRun,
  onHoverRun,
}: {
  run: AutopilotRun;
  hoveredRun: string | null;
  onHoverRun: (id: string | null) => void;
}) {
  const startTime = new Date(run.started_at);
  const endTime = run.completed_at ? new Date(run.completed_at) : new Date();
  const durationSec = Math.max(
    (endTime.getTime() - startTime.getTime()) / 1000,
    30,
  );

  // Width proportional to duration, capped between 24px and 120px
  const barWidth = Math.min(Math.max(Math.sqrt(durationSec) * 4, 24), 120);

  const isHovered = hoveredRun === run.id;

  const StatusIcon = run.run_type === 'analysis' ? Search : Play;

  return (
    <div className="relative">
      <div
        className={`flex h-7 cursor-default items-center gap-1 rounded px-1.5 text-xs transition-all ${STATUS_COLORS[run.status]} ${
          isHovered ? 'opacity-100 ring-1 ring-white/30' : 'opacity-80'
        }`}
        style={{ width: barWidth }}
        onMouseEnter={() => onHoverRun(run.id)}
        onMouseLeave={() => onHoverRun(null)}
      >
        <StatusIcon className="h-3 w-3 shrink-0 text-white/80" />
        <span className="truncate text-[10px] font-medium text-white/90">
          {startTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium capitalize text-white">
              {run.run_type}
            </span>
            <span className={`text-xs ${STATUS_TEXT_COLORS[run.status]}`}>
              {run.status}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-400">
            <div>
              Started:{' '}
              {startTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            {run.completed_at && (
              <div>Duration: {formatDuration(durationSec)}</div>
            )}
            {run.run_type === 'analysis' ? (
              <>
                <div>Items analyzed: {run.items_analyzed}</div>
                <div>Auto-approved: {run.items_auto_approved}</div>
              </>
            ) : (
              <>
                <div>Items executed: {run.items_executed}</div>
                {run.prs_created > 0 && (
                  <div>PRs created: {run.prs_created}</div>
                )}
              </>
            )}
            {run.error_message && (
              <div className="mt-1 rounded bg-red-950/50 p-1.5 text-red-400">
                {run.error_message}
              </div>
            )}
            {run.skip_reason && (
              <div className="mt-1 rounded bg-yellow-950/50 p-1.5 text-yellow-400">
                {run.skip_reason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
