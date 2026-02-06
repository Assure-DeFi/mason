'use client';

import { Shield, Users, GitFork, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PlatformStats {
  active_users: number;
  active_repos: number;
  deleted_users: number;
  deleted_repos: number;
  total_users_ever: number;
  total_repos_ever: number;
  last_deletion_at: string | null;
}

export function AdminStatsPanel() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const json = await res.json();
          setStats(json.data);
        }
      } catch {
        // Silently fail - panel just won't show data
      } finally {
        setLoading(false);
      }
    }
    void fetchStats();
  }, []);

  return (
    <div className="mt-8 rounded-lg border border-gold/30 bg-gold/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-gold/10 p-2">
          <Shield className="h-5 w-5 text-gold" />
        </div>
        <h2 className="text-lg font-semibold text-white">Platform Stats</h2>
        <span className="text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded">
          Admin
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading stats...
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Users className="h-4 w-4 text-blue-400" />}
            label="Total Users Ever"
            value={stats.total_users_ever}
            detail={`${stats.active_users} active, ${stats.deleted_users} deleted`}
          />
          <StatCard
            icon={<GitFork className="h-4 w-4 text-green-400" />}
            label="Total Repos Ever"
            value={stats.total_repos_ever}
            detail={`${stats.active_repos} active, ${stats.deleted_repos} deleted`}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-400">Unable to load stats.</p>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{detail}</p>
    </div>
  );
}
