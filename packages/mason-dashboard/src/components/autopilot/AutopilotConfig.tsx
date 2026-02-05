'use client';

import {
  Bot,
  Clock,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  Info,
  Package,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';

interface AutopilotConfigData {
  id?: string;
  enabled: boolean;
  schedule_cron: string | null;
  auto_approval_rules: {
    maxComplexity: number;
    minImpact: number;
    excludedCategories: string[];
  };
  guardian_rails: {
    maxItemsPerDay: number;
    pauseOnFailure: boolean;
  };
  execution_window: {
    startHour: number;
    endHour: number;
  };
  last_heartbeat: string | null;
}

interface Props {
  repositoryId: string | null;
  userId: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Parse cron to extract the hour (always daily format: "0 H * * *")
 */
function cronToHour(cron: string | null): number {
  if (!cron) {
    return 2;
  }
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    return 2;
  }
  return parseInt(parts[1]) || 2;
}

export function AutopilotConfig({ repositoryId, userId }: Props) {
  const { client } = useUserDatabase();
  const [config, setConfig] = useState<AutopilotConfigData>({
    enabled: false,
    schedule_cron: '0 2 * * *',
    auto_approval_rules: {
      maxComplexity: 5,
      minImpact: 1,
      excludedCategories: [],
    },
    guardian_rails: {
      maxItemsPerDay: 5,
      pauseOnFailure: true,
    },
    execution_window: {
      startHour: 0,
      endHour: 23,
    },
    last_heartbeat: null,
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [scheduleHour, setScheduleHour] = useState(2);
  const [activeItemCount, setActiveItemCount] = useState(0);

  // Load config from Supabase
  useEffect(() => {
    async function loadConfig() {
      if (!client || !repositoryId) {
        setLoading(false);
        return;
      }

      const { data, error } = await client
        .from(TABLES.AUTOPILOT_CONFIG)
        .select('*')
        .eq('repository_id', repositoryId)
        .single();

      if (data && !error) {
        setConfig(data as AutopilotConfigData);
        setScheduleHour(cronToHour(data.schedule_cron));
      }

      // Fetch active backlog items count (new + approved)
      const { count: activeCount } = await client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .select('*', { count: 'exact', head: true })
        .eq('repository_id', repositoryId)
        .in('status', ['new', 'approved']);

      setActiveItemCount(activeCount ?? 0);

      setLoading(false);
    }

    void loadConfig();
  }, [client, repositoryId]);

  // Save config to Supabase
  const saveConfig = async () => {
    if (!client || !repositoryId) {
      return;
    }

    setSaveStatus('saving');

    const payload = {
      user_id: userId,
      repository_id: repositoryId,
      enabled: config.enabled,
      schedule_cron: `0 ${scheduleHour} * * *`,
      auto_approval_rules: config.auto_approval_rules,
      guardian_rails: config.guardian_rails,
      execution_window: config.execution_window,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (config.id) {
      result = await client
        .from(TABLES.AUTOPILOT_CONFIG)
        .update(payload)
        .eq('id', config.id);
    } else {
      result = await client.from(TABLES.AUTOPILOT_CONFIG).insert(payload);
    }

    if (result.error) {
      setSaveStatus('error');
      console.error('Failed to save config:', result.error);
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Calculate heartbeat status
  const getHeartbeatStatus = () => {
    if (!config.last_heartbeat) {
      return { status: 'offline', text: 'Never' };
    }

    const heartbeat = new Date(config.last_heartbeat);
    const now = new Date();
    const diffMinutes = Math.round(
      (now.getTime() - heartbeat.getTime()) / 60000,
    );

    if (diffMinutes < 10) {
      return { status: 'online', text: `${diffMinutes} min ago` };
    }
    return { status: 'offline', text: `${diffMinutes} min ago` };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!repositoryId) {
    return (
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
        <div className="flex items-center gap-3 text-yellow-500">
          <AlertCircle className="h-5 w-5" />
          <span>Select a repository to configure autopilot.</span>
        </div>
      </div>
    );
  }

  const heartbeatInfo = getHeartbeatStatus();

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-black/50 p-4">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-lg p-3 ${config.enabled ? 'bg-green-900/30' : 'bg-gray-900'}`}
          >
            <Bot
              className={`h-6 w-6 ${config.enabled ? 'text-green-500' : 'text-gray-500'}`}
            />
          </div>
          <div>
            <h3 className="font-medium text-white">Autopilot Status</h3>
            <p className="text-sm text-gray-400">
              {config.enabled ? 'Enabled' : 'Disabled'}
              {config.enabled && (
                <span
                  className={`ml-2 ${heartbeatInfo.status === 'online' ? 'text-green-500' : 'text-red-500'}`}
                >
                  (Daemon: {heartbeatInfo.text})
                </span>
              )}
            </p>
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) =>
              setConfig({ ...config, enabled: e.target.checked })
            }
            className="peer sr-only"
          />
          <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-gold peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
        </label>
      </div>

      {/* Backlog Status */}
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Package className="h-5 w-5 text-gold" />
          <h3 className="font-medium text-white">Backlog Status</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Active Items</span>
            <span className="font-medium text-white">
              {activeItemCount} / {config.guardian_rails.maxItemsPerDay}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${
                activeItemCount >= config.guardian_rails.maxItemsPerDay
                  ? 'bg-green-500'
                  : 'bg-gold'
              }`}
              style={{
                width: `${Math.min(100, (activeItemCount / config.guardian_rails.maxItemsPerDay) * 100)}%`,
              }}
            />
          </div>

          <p className="text-xs text-gray-500">
            {activeItemCount >= config.guardian_rails.maxItemsPerDay
              ? 'Backlog is full. /pm-review will not run until items are executed.'
              : `${config.guardian_rails.maxItemsPerDay - activeItemCount} more items needed before backlog is full.`}
          </p>
        </div>
      </div>

      {/* Daily Improvements + Schedule */}
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-gold" />
          <h3 className="font-medium text-white">Daily Configuration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Daily Improvements
            </label>
            <input
              type="number"
              min="1"
              max="40"
              value={config.guardian_rails.maxItemsPerDay}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 5;
                setConfig({
                  ...config,
                  guardian_rails: {
                    ...config.guardian_rails,
                    maxItemsPerDay: Math.min(40, Math.max(1, val)),
                  },
                });
              }}
              className="mt-1 w-32 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Number of improvements to generate, approve, and implement each
              day (1-40)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Schedule Time
            </label>
            <select
              value={scheduleHour}
              onChange={(e) => setScheduleHour(parseInt(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Time to generate fresh improvements daily
            </p>
          </div>

          {/* Schedule summary */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
            <p className="text-sm text-gray-400">
              Schedule:{' '}
              <span className="font-medium text-gold">
                Daily at {scheduleHour.toString().padStart(2, '0')}:00 —{' '}
                {config.guardian_rails.maxItemsPerDay} improvements
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Guardian Rails */}
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-gold" />
          <h3 className="font-medium text-white">Safety</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-300">
              Pause on Failure
            </label>
            <p className="text-xs text-gray-500">
              Disable autopilot if an execution fails
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={config.guardian_rails.pauseOnFailure}
              onChange={(e) =>
                setConfig({
                  ...config,
                  guardian_rails: {
                    ...config.guardian_rails,
                    pauseOnFailure: e.target.checked,
                  },
                })
              }
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-gold peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
          </label>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-gray-300">How Autopilot Works</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Generates up to {config.guardian_rails.maxItemsPerDay}{' '}
                improvements daily based on current codebase
              </li>
              <li>
                Skips /pm-review when backlog already has{' '}
                {config.guardian_rails.maxItemsPerDay} active items
              </li>
              <li>Auto-approves and executes all items (2 at a time)</li>
              <li>Stale items from previous runs are automatically archived</li>
              <li>Runs on your local machine using your Claude Pro Max</li>
            </ul>
            <div className="mt-4 space-y-2">
              <p className="font-medium text-gray-300">Setup Instructions</p>
              <div className="space-y-1.5">
                <p>
                  <span className="text-gray-500">
                    1. Authenticate with Claude:
                  </span>{' '}
                  <code className="rounded bg-gray-800 px-1.5 py-0.5">
                    claude setup-token
                  </code>
                </p>
                <p className="ml-6 text-xs text-gray-500">
                  This creates ~/.claude/.credentials.json with your OAuth token
                </p>
                <p>
                  <span className="text-gray-500">2. Install:</span>{' '}
                  <code className="rounded bg-gray-800 px-1.5 py-0.5">
                    npm install -g mason-autopilot
                  </code>
                </p>
                <p>
                  <span className="text-gray-500">3. Initialize:</span>{' '}
                  <code className="rounded bg-gray-800 px-1.5 py-0.5">
                    mason-autopilot init
                  </code>
                </p>
                <p>
                  <span className="text-gray-500">4. Start daemon:</span>{' '}
                  <code className="select-all rounded bg-gold/20 px-1.5 py-0.5 font-medium text-gold">
                    mason-autopilot start
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 rounded-lg bg-gold px-6 py-2 font-medium text-navy transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveStatus === 'saving' && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {saveStatus === 'saved' && <Check className="h-4 w-4" />}
          {saveStatus === 'error' && <AlertCircle className="h-4 w-4" />}
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved!'
              : saveStatus === 'error'
                ? 'Error - Retry'
                : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
