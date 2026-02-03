'use client';

import {
  Bot,
  Clock,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';

interface AutoApprovalRules {
  maxComplexity: number;
  minImpact: number;
  excludedCategories: string[];
}

interface GuardianRails {
  maxItemsPerDay: number;
  pauseOnFailure: boolean;
  requireHumanReviewComplexity: number;
}

interface ExecutionWindow {
  startHour: number;
  endHour: number;
}

interface AutopilotConfigData {
  id?: string;
  enabled: boolean;
  schedule_cron: string | null;
  auto_approval_rules: AutoApprovalRules;
  guardian_rails: GuardianRails;
  execution_window: ExecutionWindow;
  last_heartbeat: string | null;
}

interface Props {
  repositoryId: string | null;
  userId: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type FrequencyType = 'minutes' | 'hours' | 'daily' | 'weekly';

interface FrequencyConfig {
  type: FrequencyType;
  interval: number;
  timeHour: number;
  dayOfWeek: number;
}

const FREQUENCY_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: 'minutes', label: 'Every X minutes' },
  { value: 'hours', label: 'Every X hours' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const MINUTE_INTERVALS = [5, 10, 15, 30, 45];
const HOUR_INTERVALS = [1, 2, 3, 4, 6, 8, 12];
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Convert frequency config to cron expression
function frequencyToCron(freq: FrequencyConfig): string {
  switch (freq.type) {
    case 'minutes':
      return `*/${freq.interval} * * * *`;
    case 'hours':
      return `0 */${freq.interval} * * *`;
    case 'daily':
      return `0 ${freq.timeHour} * * *`;
    case 'weekly':
      return `0 ${freq.timeHour} * * ${freq.dayOfWeek}`;
    default:
      return '0 2 * * *';
  }
}

// Parse cron expression to frequency config
function cronToFrequency(cron: string | null): FrequencyConfig {
  if (!cron) {
    return { type: 'daily', interval: 1, timeHour: 2, dayOfWeek: 1 };
  }

  const parts = cron.split(' ');
  if (parts.length !== 5) {
    return { type: 'daily', interval: 1, timeHour: 2, dayOfWeek: 1 };
  }

  const [minute, hour, , , dayOfWeek] = parts;

  // Check for minute interval: */X * * * *
  if (minute.startsWith('*/') && hour === '*') {
    return {
      type: 'minutes',
      interval: parseInt(minute.slice(2)) || 30,
      timeHour: 2,
      dayOfWeek: 1,
    };
  }

  // Check for hour interval: 0 */X * * *
  if (minute === '0' && hour.startsWith('*/')) {
    return {
      type: 'hours',
      interval: parseInt(hour.slice(2)) || 1,
      timeHour: 2,
      dayOfWeek: 1,
    };
  }

  // Check for weekly: 0 X * * Y (where Y is 0-6)
  if (minute === '0' && !hour.includes('*') && dayOfWeek !== '*') {
    return {
      type: 'weekly',
      interval: 1,
      timeHour: parseInt(hour) || 2,
      dayOfWeek: parseInt(dayOfWeek) || 1,
    };
  }

  // Default to daily: 0 X * * *
  return {
    type: 'daily',
    interval: 1,
    timeHour: parseInt(hour) || 2,
    dayOfWeek: 1,
  };
}

// Get human-readable description of frequency
function getFrequencyDescription(freq: FrequencyConfig): string {
  switch (freq.type) {
    case 'minutes':
      return `Every ${freq.interval} minutes`;
    case 'hours':
      return `Every ${freq.interval} hour${freq.interval > 1 ? 's' : ''}`;
    case 'daily':
      return `Daily at ${freq.timeHour.toString().padStart(2, '0')}:00`;
    case 'weekly': {
      const day =
        DAYS_OF_WEEK.find((d) => d.value === freq.dayOfWeek)?.label || 'Monday';
      return `Every ${day} at ${freq.timeHour.toString().padStart(2, '0')}:00`;
    }
    default:
      return 'Unknown schedule';
  }
}

const CATEGORY_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'auth', label: 'Authentication' },
  { value: 'backend', label: 'Backend' },
];

interface BacklogStatus {
  count: number;
  threshold: number;
  percentFull: number;
  isFull: boolean;
}

// Calculate estimated runs per day based on frequency config
function getEstimatedRunsPerDay(freq: FrequencyConfig): number {
  switch (freq.type) {
    case 'minutes':
      return Math.floor((24 * 60) / freq.interval);
    case 'hours':
      return Math.floor(24 / freq.interval);
    case 'daily':
      return 1;
    case 'weekly':
      return 1 / 7;
    default:
      return 1;
  }
}

// Check if schedule generates way more items than can be processed
function getFrequencyWarning(
  freq: FrequencyConfig,
  maxItemsPerDay: number,
): string | null {
  const runsPerDay = getEstimatedRunsPerDay(freq);
  // Assume average 15 items per run
  const estimatedItemsPerDay = runsPerDay * 15;

  if (estimatedItemsPerDay > maxItemsPerDay * 10) {
    return `This schedule runs ~${Math.round(runsPerDay)} times/day, potentially generating ${Math.round(estimatedItemsPerDay)} items while only ${maxItemsPerDay} can be processed. PM reviews will pause when backlog reaches ${maxItemsPerDay * 5} items.`;
  }

  return null;
}

export function AutopilotConfig({ repositoryId, userId }: Props) {
  const { client } = useUserDatabase();
  const [config, setConfig] = useState<AutopilotConfigData>({
    enabled: false,
    schedule_cron: '0 2 * * *',
    auto_approval_rules: {
      maxComplexity: 2,
      minImpact: 7,
      excludedCategories: [],
    },
    guardian_rails: {
      maxItemsPerDay: 3,
      pauseOnFailure: true,
      requireHumanReviewComplexity: 5,
    },
    execution_window: {
      startHour: 22,
      endHour: 6,
    },
    last_heartbeat: null,
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [frequency, setFrequency] = useState<FrequencyConfig>({
    type: 'daily',
    interval: 1,
    timeHour: 2,
    dayOfWeek: 1,
  });
  const [backlogStatus, setBacklogStatus] = useState<BacklogStatus | null>(
    null,
  );

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
        // Parse cron to human-readable frequency
        setFrequency(cronToFrequency(data.schedule_cron));
      }

      setLoading(false);
    }

    void loadConfig();
  }, [client, repositoryId]);

  // Load backlog status (separate effect to recalculate when maxItemsPerDay changes)
  useEffect(() => {
    async function loadBacklogStatus() {
      if (!client || !repositoryId) {
        return;
      }

      // Count pending items (new + approved)
      const { count, error } = await client
        .from(TABLES.PM_BACKLOG_ITEMS)
        .select('*', { count: 'exact', head: true })
        .eq('repository_id', repositoryId)
        .in('status', ['new', 'approved']);

      if (!error) {
        const actualCount = count ?? 0;
        const threshold = config.guardian_rails.maxItemsPerDay * 5;
        const percentFull = Math.round((actualCount / threshold) * 100);
        setBacklogStatus({
          count: actualCount,
          threshold,
          percentFull: Math.min(percentFull, 100),
          isFull: actualCount >= threshold,
        });
      }
    }

    void loadBacklogStatus();
  }, [client, repositoryId, config.guardian_rails.maxItemsPerDay]);

  // Save config to Supabase
  const saveConfig = async () => {
    if (!client || !repositoryId) {
      return;
    }

    setSaveStatus('saving');

    const cronValue = frequencyToCron(frequency);

    const payload = {
      user_id: userId,
      repository_id: repositoryId,
      enabled: config.enabled,
      schedule_cron: cronValue,
      auto_approval_rules: config.auto_approval_rules,
      guardian_rails: config.guardian_rails,
      execution_window: config.execution_window,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (config.id) {
      // Update existing
      result = await client
        .from(TABLES.AUTOPILOT_CONFIG)
        .update(payload)
        .eq('id', config.id);
    } else {
      // Insert new
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

      {/* Backlog Status Indicator */}
      {backlogStatus && (
        <div
          className={`rounded-lg border p-4 ${
            backlogStatus.isFull
              ? 'border-yellow-900/50 bg-yellow-950/30'
              : 'border-gray-800 bg-black/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package
                className={`h-5 w-5 ${backlogStatus.isFull ? 'text-yellow-400' : 'text-gray-400'}`}
              />
              <div>
                <h4 className="text-sm font-medium text-white">
                  Backlog Status
                </h4>
                <p className="text-xs text-gray-400">
                  {backlogStatus.count}/{backlogStatus.threshold} pending items
                  ({backlogStatus.percentFull}% full)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`text-sm font-medium ${
                  backlogStatus.isFull ? 'text-yellow-400' : 'text-green-400'
                }`}
              >
                {backlogStatus.isFull ? 'At Capacity' : 'Has Capacity'}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full transition-all ${
                backlogStatus.percentFull >= 100
                  ? 'bg-yellow-500'
                  : backlogStatus.percentFull >= 80
                    ? 'bg-yellow-600'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(backlogStatus.percentFull, 100)}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-gray-500">
            PM reviews pause at {backlogStatus.threshold} items (5x daily limit
            of {config.guardian_rails.maxItemsPerDay})
          </p>
        </div>
      )}

      {/* Schedule */}
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-gold" />
          <h3 className="font-medium text-white">Schedule</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Run Frequency
            </label>
            <select
              value={frequency.type}
              onChange={(e) =>
                setFrequency({
                  ...frequency,
                  type: e.target.value as FrequencyType,
                  interval:
                    e.target.value === 'minutes'
                      ? 30
                      : e.target.value === 'hours'
                        ? 1
                        : frequency.interval,
                })
              }
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Minutes interval selector */}
          {frequency.type === 'minutes' && (
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Interval
              </label>
              <select
                value={frequency.interval}
                onChange={(e) =>
                  setFrequency({
                    ...frequency,
                    interval: parseInt(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
              >
                {MINUTE_INTERVALS.map((m) => (
                  <option key={m} value={m}>
                    Every {m} minutes
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hours interval selector */}
          {frequency.type === 'hours' && (
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Interval
              </label>
              <select
                value={frequency.interval}
                onChange={(e) =>
                  setFrequency({
                    ...frequency,
                    interval: parseInt(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
              >
                {HOUR_INTERVALS.map((h) => (
                  <option key={h} value={h}>
                    Every {h} hour{h > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Time of day selector for daily/weekly */}
          {(frequency.type === 'daily' || frequency.type === 'weekly') && (
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Time of Day
              </label>
              <select
                value={frequency.timeHour}
                onChange={(e) =>
                  setFrequency({
                    ...frequency,
                    timeHour: parseInt(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Day of week selector for weekly */}
          {frequency.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Day of Week
              </label>
              <select
                value={frequency.dayOfWeek}
                onChange={(e) =>
                  setFrequency({
                    ...frequency,
                    dayOfWeek: parseInt(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Schedule summary */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
            <p className="text-sm text-gray-400">
              Schedule:{' '}
              <span className="font-medium text-gold">
                {getFrequencyDescription(frequency)}
              </span>
            </p>
          </div>

          {/* Frequency warning */}
          {getFrequencyWarning(
            frequency,
            config.guardian_rails.maxItemsPerDay,
          ) && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-900/50 bg-yellow-950/30 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
              <p className="text-sm text-yellow-400">
                {getFrequencyWarning(
                  frequency,
                  config.guardian_rails.maxItemsPerDay,
                )}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Execution Window
            </label>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={config.execution_window.startHour}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    execution_window: {
                      ...config.execution_window,
                      startHour: parseInt(e.target.value),
                    },
                  })
                }
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-gold focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span className="text-gray-400">to</span>
              <select
                value={config.execution_window.endHour}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    execution_window: {
                      ...config.execution_window,
                      endHour: parseInt(e.target.value),
                    },
                  })
                }
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-gold focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Autopilot will only run within this time window
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Approval Rules */}
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-gold" />
          <h3 className="font-medium text-white">Auto-Approval Rules</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Max Complexity (items with complexity ≤ this value auto-approve)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={config.auto_approval_rules.maxComplexity}
              onChange={(e) =>
                setConfig({
                  ...config,
                  auto_approval_rules: {
                    ...config.auto_approval_rules,
                    maxComplexity: parseInt(e.target.value),
                  },
                })
              }
              className="mt-2 w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 (Simple)</span>
              <span className="text-gold">
                {config.auto_approval_rules.maxComplexity}
              </span>
              <span>5 (Complex)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Min Impact (items with impact ≥ this value auto-approve)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.auto_approval_rules.minImpact}
              onChange={(e) =>
                setConfig({
                  ...config,
                  auto_approval_rules: {
                    ...config.auto_approval_rules,
                    minImpact: parseInt(e.target.value),
                  },
                })
              }
              className="mt-2 w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 (Low)</span>
              <span className="text-gold">
                {config.auto_approval_rules.minImpact}
              </span>
              <span>10 (High)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Excluded Categories
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <label
                  key={cat.value}
                  className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={config.auto_approval_rules.excludedCategories.includes(
                      cat.value,
                    )}
                    onChange={(e) => {
                      const newExcluded = e.target.checked
                        ? [
                            ...config.auto_approval_rules.excludedCategories,
                            cat.value,
                          ]
                        : config.auto_approval_rules.excludedCategories.filter(
                            (c) => c !== cat.value,
                          );
                      setConfig({
                        ...config,
                        auto_approval_rules: {
                          ...config.auto_approval_rules,
                          excludedCategories: newExcluded,
                        },
                      });
                    }}
                    className="rounded border-gray-600"
                  />
                  <span className="text-sm text-gray-300">{cat.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Items in checked categories will never be auto-approved
            </p>
          </div>
        </div>
      </div>

      {/* Guardian Rails */}
      <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-gold" />
          <h3 className="font-medium text-white">Guardian Rails</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Max Items Per Day
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.guardian_rails.maxItemsPerDay}
              onChange={(e) =>
                setConfig({
                  ...config,
                  guardian_rails: {
                    ...config.guardian_rails,
                    maxItemsPerDay: parseInt(e.target.value) || 3,
                  },
                })
              }
              className="mt-1 w-32 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum items to auto-approve and execute per day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Require Human Review Above Complexity
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={config.guardian_rails.requireHumanReviewComplexity}
              onChange={(e) =>
                setConfig({
                  ...config,
                  guardian_rails: {
                    ...config.guardian_rails,
                    requireHumanReviewComplexity: parseInt(e.target.value),
                  },
                })
              }
              className="mt-2 w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span className="text-gold">
                {config.guardian_rails.requireHumanReviewComplexity}
              </span>
              <span>5</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Items with complexity above this will always require manual
              approval
            </p>
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
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-gray-300">How Autopilot Works</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Runs on your local machine using your Claude Pro Max</li>
              <li>Polls this config every 5 minutes</li>
              <li>Executes PM review and auto-approves matching items</li>
              <li>Creates PRs for approved items automatically</li>
            </ul>
            <div className="mt-4 space-y-2">
              <p className="font-medium text-gray-300">Setup Instructions</p>
              <div className="space-y-1.5">
                <p>
                  <span className="text-gray-500">1. Install:</span>{' '}
                  <code className="rounded bg-gray-800 px-1.5 py-0.5">
                    npm install -g mason-autopilot
                  </code>
                </p>
                <p>
                  <span className="text-gray-500">2. Initialize:</span>{' '}
                  <code className="rounded bg-gray-800 px-1.5 py-0.5">
                    mason-autopilot init
                  </code>
                </p>
                <p>
                  <span className="text-gray-500">3. Start daemon:</span>{' '}
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
