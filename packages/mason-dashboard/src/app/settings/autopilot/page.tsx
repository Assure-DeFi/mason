'use client';

import { ArrowLeft, Bot, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { ActivityLog } from '@/components/autopilot/ActivityLog';
import { AutopilotConfig } from '@/components/autopilot/AutopilotConfig';
import { RepositorySelector } from '@/components/execution/repository-selector';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { canAccessAutopilot } from '@/lib/feature-flags';

export default function AutopilotSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isConfigured, isLoading: isDbLoading } = useUserDatabase();
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'activity'>('config');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Check beta access
  const userEmail = session?.user?.github_email;
  const hasBetaAccess = canAccessAutopilot(userEmail);

  if (status === 'loading' || isDbLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // If user doesn't have beta access, show gated message
  if (!hasBetaAccess) {
    return (
      <div className="flex min-h-screen flex-col bg-navy">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
              <Bot className="h-8 w-8 text-gray-500" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-white">
              Autopilot is in Private Beta
            </h1>
            <p className="mb-6 text-gray-400">
              Autopilot enables automated codebase analysis and execution. This
              feature is currently available to select beta testers.
            </p>
            <p className="text-sm text-gray-500">
              Contact{' '}
              <a href="mailto:support@assuredefi.com" className="text-gold">
                support@assuredefi.com
              </a>{' '}
              to request access.
            </p>
            <Link
              href="/admin/backlog"
              className="mt-8 inline-flex items-center gap-2 text-sm text-gold hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
        <PoweredByFooter />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen flex-col bg-navy">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="mb-3 text-2xl font-bold text-white">
              Database Not Configured
            </h1>
            <p className="mb-6 text-gray-400">
              Please complete the initial setup to configure your Supabase
              database before using Autopilot.
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-navy hover:opacity-90"
            >
              Complete Setup
            </Link>
          </div>
        </div>
        <PoweredByFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy">
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/backlog"
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gold/20 p-2">
                <Bot className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Autopilot Settings
                </h1>
                <p className="text-gray-400">
                  Configure automated analysis and execution
                </p>
              </div>
            </div>
          </div>

          {/* Repository Selector */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Select Repository
            </label>
            <RepositorySelector
              value={selectedRepoId}
              onChange={setSelectedRepoId}
            />
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-800">
            <nav className="-mb-px flex gap-6">
              <button
                onClick={() => setActiveTab('config')}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'config'
                    ? 'border-gold text-gold'
                    : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-white'
                }`}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'border-gold text-gold'
                    : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-white'
                }`}
              >
                Activity Log
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'config' ? (
            <AutopilotConfig
              repositoryId={selectedRepoId}
              userId={session.user.id}
            />
          ) : (
            <ActivityLog repositoryId={selectedRepoId} />
          )}
        </div>
      </div>

      <PoweredByFooter />
    </div>
  );
}
