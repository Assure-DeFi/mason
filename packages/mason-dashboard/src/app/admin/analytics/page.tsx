'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  Zap,
  Target,
  Calendar,
  Flame,
  Award,
  BarChart3,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';

import { UserMenu } from '@/components/auth/user-menu';
import { MasonMark } from '@/components/brand';
import { RepositorySelector } from '@/components/execution/repository-selector';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import {
  getCompletionsByTimePeriod,
  getTechnicalDebtBurndown,
  getCategoryBreakdown,
  getAverageCompletionTime,
  getCompletionStreak,
  getVelocity,
} from '@/lib/analytics';
import { TABLES } from '@/lib/constants';
import type { BacklogItem } from '@/types/backlog';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({
  label,
  value,
  sublabel,
  icon,
  color,
  trend,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-black border border-gray-800 p-6 overflow-hidden group hover:border-${color}-400/30 transition-colors`}
    >
      {/* Background gradient effect */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-${color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`text-${color}-400 bg-${color}-400/10 p-3`}>
            {icon}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-mono ${
                trend === 'up'
                  ? 'text-green-400'
                  : trend === 'down'
                    ? 'text-red-400'
                    : 'text-gray-400'
              }`}
            >
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'neutral' && '→'}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div
            className={`text-4xl font-bold text-${color}-400 font-mono tracking-tight`}
          >
            {value}
          </div>
          <div className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            {label}
          </div>
          {sublabel && (
            <div className="text-xs text-gray-500 font-mono">{sublabel}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface BarChartProps {
  data: Array<{ date: string; count: number }>;
  maxValue: number;
  period: 'week' | 'month';
}

function BarChart({ data, maxValue, period }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No completion data yet</p>
        </div>
      </div>
    );
  }

  const formatLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === 'week') {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return date.toLocaleString('en-US', { month: 'short' });
  };

  return (
    <div className="h-64 flex items-end justify-between gap-2 px-2">
      {data.map((point, idx) => {
        const heightPercent = maxValue > 0 ? (point.count / maxValue) * 100 : 0;

        return (
          <motion.div
            key={point.date}
            initial={{ height: 0 }}
            animate={{ height: `${heightPercent}%` }}
            transition={{ delay: idx * 0.05, duration: 0.4 }}
            className="flex-1 flex flex-col items-center group"
          >
            <div className="relative w-full h-full flex flex-col justify-end">
              <div className="relative h-full bg-gradient-to-t from-gold to-gold/60 group-hover:from-gold group-hover:to-gold/80 transition-all min-h-[4px]">
                {/* Value label on hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-gray-700 px-2 py-1 text-xs font-mono text-white whitespace-nowrap z-10">
                  {point.count}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-600 font-mono mt-2 whitespace-nowrap">
              {formatLabel(point.date)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface BurndownChartProps {
  data: Array<{ date: string; remaining: number }>;
}

function BurndownChart({ data }: BurndownChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No burndown data yet</p>
        </div>
      </div>
    );
  }

  const maxRemaining = Math.max(...data.map((d) => d.remaining));
  const minRemaining = Math.min(...data.map((d) => d.remaining));

  return (
    <div className="h-64 relative">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-px bg-gray-800/50" />
        ))}
      </div>

      {/* Line path */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          d={
            data.length > 1
              ? data
                  .map((point, idx) => {
                    const x = (idx / (data.length - 1)) * 100;
                    const y =
                      100 -
                      ((point.remaining - minRemaining) /
                        (maxRemaining - minRemaining || 1)) *
                        100;
                    return `${idx === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                  })
                  .join(' ')
              : ''
          }
          fill="none"
          stroke="#E2D243"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Data points */}
      {data.map((point, idx) => {
        const x = (idx / (data.length - 1)) * 100;
        const y =
          100 -
          ((point.remaining - minRemaining) /
            (maxRemaining - minRemaining || 1)) *
            100;

        return (
          <motion.div
            key={point.date}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
            className="absolute w-2 h-2 bg-gold rounded-full -translate-x-1 -translate-y-1 group"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-gray-700 px-2 py-1 text-xs font-mono text-white whitespace-nowrap z-10">
              {point.remaining}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface RingChartProps {
  data: Array<{ label: string; value: number; color: string }>;
}

function RingChart({ data }: RingChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-600">
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No category data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {data.map((item, idx) => {
            const percentage = (item.value / total) * 100;
            const prevPercentage = data
              .slice(0, idx)
              .reduce((sum, d) => sum + (d.value / total) * 100, 0);

            const radius = 35;
            const circumference = 2 * Math.PI * radius;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((prevPercentage / 100) * circumference);

            return (
              <motion.circle
                key={item.label}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray }}
                transition={{ delay: idx * 0.2, duration: 0.8 }}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                className="drop-shadow-lg"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-white font-mono">
              {total}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Total
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full">
        {data.map((item) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-300">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-gray-400">
                  {item.value}
                </span>
                <span className="text-xs font-mono text-gray-600 w-12 text-right">
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const { client, isConfigured, isLoading: isDbLoading } = useUserDatabase();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (!client || !session?.user || !isConfigured) {
      setIsLoading(false);
      return;
    }

    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const { data: userData } = await client
          .from(TABLES.USERS)
          .select('id')
          .eq('github_id', session.user.github_id)
          .single();

        if (!userData) {
          setItems([]);
          return;
        }

        let query = client
          .from(TABLES.PM_BACKLOG_ITEMS)
          .select('*')
          .eq('user_id', userData.id);

        if (selectedRepoId) {
          query = query.eq('repository_id', selectedRepoId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching items:', error);
          setItems([]);
        } else {
          setItems(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchItems();
  }, [client, session, isConfigured, selectedRepoId]);

  // Analytics calculations
  const completionData = useMemo(
    () => getCompletionsByTimePeriod(items, periodMode),
    [items, periodMode],
  );

  const burndownData = useMemo(() => getTechnicalDebtBurndown(items), [items]);

  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(items.filter((i) => i.status === 'completed')),
    [items],
  );

  const avgCompletionTime = useMemo(
    () => getAverageCompletionTime(items),
    [items],
  );

  const currentStreak = useMemo(() => getCompletionStreak(items), [items]);

  const velocity = useMemo(() => getVelocity(items, 4), [items]);

  const totalCompleted = useMemo(
    () => items.filter((i) => i.status === 'completed').length,
    [items],
  );

  const maxCompletions = Math.max(...completionData.map((d) => d.count), 1);

  // Ring chart data
  const categoryRingData = useMemo(
    () => [
      {
        label: 'Frontend',
        value: categoryBreakdown.frontend,
        color: '#06B6D4',
      },
      { label: 'Backend', value: categoryBreakdown.backend, color: '#8B5CF6' },
    ],
    [categoryBreakdown],
  );

  if (!isConfigured && !isDbLoading) {
    return (
      <main className="min-h-screen bg-[#0A0724]">
        <div className="border-b border-gray-800">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <MasonMark size="lg" />
                <div className="h-10 w-px bg-gray-700" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Analytics</h1>
                  <p className="text-sm text-gray-400 mt-1">
                    Progress insights and metrics
                  </p>
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="border border-gray-800 bg-black/50 p-8 text-center">
            <Activity className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h2 className="mb-2 text-xl font-semibold text-white">
              Setup Required
            </h2>
            <p className="mb-6 text-gray-400">
              Complete the setup wizard to start tracking analytics.
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 bg-gold px-6 py-3 font-medium text-[#0A0724] transition-opacity hover:opacity-90"
            >
              Complete Setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0724]">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MasonMark size="lg" />
              <div className="h-10 w-px bg-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-white">Analytics</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Progress insights and metrics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {session && (
                <RepositorySelector
                  value={selectedRepoId}
                  onChange={setSelectedRepoId}
                />
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading analytics...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Completed"
                value={totalCompleted}
                icon={<Award className="w-6 h-6" />}
                color="green"
                trend="up"
              />
              <StatCard
                label="Avg Time"
                value={
                  avgCompletionTime !== null
                    ? `${avgCompletionTime.toFixed(1)}d`
                    : 'N/A'
                }
                sublabel="Days to complete"
                icon={<Calendar className="w-6 h-6" />}
                color="cyan"
              />
              <StatCard
                label="Current Streak"
                value={currentStreak}
                sublabel="Consecutive days"
                icon={<Flame className="w-6 h-6" />}
                color="gold"
                trend={currentStreak > 0 ? 'up' : 'neutral'}
              />
              <StatCard
                label="Velocity"
                value={velocity !== null ? velocity.toFixed(1) : 'N/A'}
                sublabel="Items per week"
                icon={<Zap className="w-6 h-6" />}
                color="purple"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Completion Trend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-black border border-gray-800 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Completion Trend
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Items completed over time
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPeriodMode('week')}
                      className={`px-3 py-1 text-xs font-mono border transition-colors ${
                        periodMode === 'week'
                          ? 'bg-gold text-[#0A0724] border-gold'
                          : 'bg-black text-gray-400 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setPeriodMode('month')}
                      className={`px-3 py-1 text-xs font-mono border transition-colors ${
                        periodMode === 'month'
                          ? 'bg-gold text-[#0A0724] border-gold'
                          : 'bg-black text-gray-400 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      Month
                    </button>
                  </div>
                </div>
                <BarChart
                  data={completionData}
                  maxValue={maxCompletions}
                  period={periodMode}
                />
              </motion.div>

              {/* Technical Debt Burndown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-black border border-gray-800 p-6"
              >
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">
                    Technical Debt Burndown
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Remaining items over time
                  </p>
                </div>
                <BurndownChart data={burndownData} />
              </motion.div>

              {/* Category Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-black border border-gray-800 p-6"
              >
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">
                    Category Breakdown
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Completed items by area
                  </p>
                </div>
                <RingChart data={categoryRingData} />
              </motion.div>

              {/* Quick Stats Panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-black border border-gray-800 p-6"
              >
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Quick Stats</h2>
                  <p className="text-xs text-gray-500 mt-1">At a glance</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
                    <span className="text-sm text-gray-400">Total Items</span>
                    <span className="text-xl font-bold font-mono text-white">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
                    <span className="text-sm text-gray-400">In Progress</span>
                    <span className="text-xl font-bold font-mono text-yellow-400">
                      {items.filter((i) => i.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
                    <span className="text-sm text-gray-400">
                      Completion Rate
                    </span>
                    <span className="text-xl font-bold font-mono text-green-400">
                      {items.length > 0
                        ? ((totalCompleted / items.length) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-400">New Items</span>
                    <span className="text-xl font-bold font-mono text-cyan-400">
                      {items.filter((i) => i.status === 'new').length}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Navigation Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center pt-4"
            >
              <Link
                href="/admin/backlog"
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-gray-800/50 transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                Back to Backlog
              </Link>
            </motion.div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-8 mt-8 border-t border-gray-800">
        <PoweredByFooter showCTA={false} />
      </div>
    </main>
  );
}
