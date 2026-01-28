'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { RepositoryList } from '@/components/github/repository-list';
import { ConnectRepoModal } from '@/components/github/connect-repo-modal';
import type { GitHubRepository } from '@/types/auth';

export default function GitHubSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectedRepoIds, setConnectedRepoIds] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchConnectedRepoIds();
  }, [refreshKey]);

  const fetchConnectedRepoIds = async () => {
    try {
      const response = await fetch('/api/github/repositories');
      if (response.ok) {
        const data = await response.json();
        setConnectedRepoIds(
          data.repositories.map((r: GitHubRepository) => r.github_repo_id),
        );
      }
    } catch (error) {
      console.error('Error fetching connected repos:', error);
    }
  };

  const handleConnect = async (owner: string, name: string) => {
    const response = await fetch('/api/github/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, name }),
    });

    if (!response.ok) {
      throw new Error('Failed to connect repository');
    }

    setRefreshKey((k) => k + 1);
    setIsModalOpen(false);
  };

  const handleDisconnect = () => {
    setRefreshKey((k) => k + 1);
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-navy">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <Link
            href="/admin/backlog"
            className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Backlog
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                GitHub Repositories
              </h1>
              <p className="mt-1 text-gray-400">
                Manage repositories for executing approved improvements
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Connect Repository
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-medium text-white">
              Connected Repositories
            </h2>
          </div>

          <RepositoryList key={refreshKey} onDisconnect={handleDisconnect} />
        </div>

        <div className="mt-8 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <h3 className="font-medium text-white">Required Permissions</h3>
          <p className="mt-1 text-sm text-gray-400">
            Mason requires the following GitHub permissions to execute
            improvements:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-400">
            <li>
              <span className="text-gray-300">Contents:</span> Read and write
              repository files
            </li>
            <li>
              <span className="text-gray-300">Pull Requests:</span> Create pull
              requests with changes
            </li>
            <li>
              <span className="text-gray-300">Metadata:</span> Read repository
              information
            </li>
          </ul>
        </div>

        <PoweredByFooter />
      </div>

      <ConnectRepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
        connectedRepoIds={connectedRepoIds}
      />
    </div>
  );
}
