'use client';

import {
  Bot,
  Clock,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  Info,
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

const SCHEDULE_PRESETS = [
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Weekly (Monday 2 AM)', value: '0 2 * * 1' },
  { label: 'Weekly (Sunday 6 AM)', value: '0 6 * * 0' },
  { label: 'Custom', value: 'custom' },
];

const CATEGORY_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'auth', label: 'Authentication' },
  { value: 'backend', label: 'Backend' },
];

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
  const [customCron, setCustomCron] = useState('');
  const [schedulePreset, setSchedulePreset] = useState('0 2 * * *');

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
        // Determine if using preset or custom cron
        const matchedPreset = SCHEDULE_PRESETS.find(
          (p) => p.value === data.schedule_cron,
        );
        if (matchedPreset) {
          setSchedulePreset(matchedPreset.value);
        } else if (data.schedule_cron) {
          setSchedulePreset('custom');
          setCustomCron(data.schedule_cron);
        }
      }

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

    const cronValue = schedulePreset === 'custom' ? customCron : schedulePreset;

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
              value={schedulePreset}
              onChange={(e) => setSchedulePreset(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:border-gold focus:outline-none"
            >
              {SCHEDULE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {schedulePreset === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Cron Expression
              </label>
              <input
                type="text"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 2 * * *"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-gold focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: minute hour day-of-month month day-of-week
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
            <p className="mt-3">
              <span className="font-medium text-gold">Setup required:</span> Run{' '}
              <code className="rounded bg-gray-800 px-1.5 py-0.5">
                npm install -g mason-autopilot && mason-autopilot init
              </code>
            </p>
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
