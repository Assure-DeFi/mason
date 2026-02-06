'use client';

import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Database,
  ArrowRight,
  Shield,
  Zap,
  Terminal,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

import { ConfirmationDialog } from '@/components/backlog/confirmation-dialog';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';

type ProviderName = 'anthropic' | 'openai' | 'google';

interface ProviderKeyInfo {
  id: string;
  provider: ProviderName;
  api_key: string;
  model: string | null;
  is_active: boolean;
  updated_at: string;
}

interface AutopilotProviderInfo {
  active_provider: string | null;
  active_model: string | null;
  provider_source: string | null;
  last_heartbeat: string | null;
}

const PROVIDERS: {
  id: ProviderName;
  name: string;
  envVar: string;
  defaultModel: string;
}[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
  },
  {
    id: 'google',
    name: 'Google',
    envVar: 'GOOGLE_API_KEY',
    defaultModel: 'gemini-2.5-pro',
  },
];

const SOURCE_LABELS: Record<string, string> = {
  claude_oauth: 'Claude Code (OAuth)',
  env_var: 'Environment Variable',
  database: 'Stored API Key',
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) {
    return 'Never';
  }
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return new Date(dateString).toLocaleDateString();
}

function maskKey(key: string): string {
  if (key.length <= 16) {
    return key.slice(0, 4) + '...' + key.slice(-4);
  }
  return key.slice(0, 12) + '...' + key.slice(-4);
}

export default function AiProvidersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { client, isConfigured, isLoading: isDbLoading } = useUserDatabase();

  const [keys, setKeys] = useState<ProviderKeyInfo[]>([]);
  const [autopilotInfo, setAutopilotInfo] =
    useState<AutopilotProviderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // New key form state
  const [addingProvider, setAddingProvider] = useState<ProviderName | null>(
    null,
  );
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation
  const [keyToDelete, setKeyToDelete] = useState<ProviderKeyInfo | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Info section
  const [showInfo, setShowInfo] = useState(false);

  const fetchData = useCallback(async () => {
    if (!client || !session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get user ID
      const { data: userData } = await client
        .from(TABLES.USERS)
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (!userData) {
        setIsLoading(false);
        return;
      }

      setUserId(userData.id);

      // Fetch stored keys
      const { data: keysData } = await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .select('id, provider, api_key, model, is_active, updated_at')
        .eq('user_id', userData.id)
        .order('updated_at', { ascending: false });

      setKeys((keysData as ProviderKeyInfo[]) || []);

      // Fetch autopilot config for active provider info
      const { data: configData } = await client
        .from(TABLES.AUTOPILOT_CONFIG)
        .select(
          'active_provider, active_model, provider_source, last_heartbeat',
        )
        .eq('user_id', userData.id)
        .limit(1)
        .single();

      if (configData) {
        setAutopilotInfo(configData as AutopilotProviderInfo);
      }
    } catch (err) {
      console.error('Error fetching AI provider data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [client, session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session && isConfigured && !isDbLoading) {
      void fetchData();
    } else if (!isDbLoading && !isConfigured) {
      setIsLoading(false);
    }
  }, [session, fetchData, isConfigured, isDbLoading]);

  const handleSaveKey = async () => {
    if (!client || !userId || !addingProvider || !newKeyValue.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const provider = PROVIDERS.find((p) => p.id === addingProvider)!;

      const { error: upsertError } = await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .upsert(
          {
            user_id: userId,
            provider: addingProvider,
            api_key: newKeyValue.trim(),
            model: provider.defaultModel,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' },
        );

      if (upsertError) {
        throw upsertError;
      }

      // Deactivate other providers
      await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('provider', addingProvider);

      setAddingProvider(null);
      setNewKeyValue('');
      setShowNewKey(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!client) {
      return;
    }

    setIsDeletingId(id);
    try {
      await client.from(TABLES.AI_PROVIDER_KEYS).delete().eq('id', id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error('Error deleting key:', err);
    } finally {
      setIsDeletingId(null);
      setKeyToDelete(null);
    }
  };

  const handleSetActive = async (key: ProviderKeyInfo) => {
    if (!client || !userId) {
      return;
    }

    try {
      // Deactivate all
      await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .update({ is_active: false })
        .eq('user_id', userId);

      // Activate selected
      await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .update({ is_active: true })
        .eq('id', key.id);

      await fetchData();
    } catch (err) {
      console.error('Error setting active provider:', err);
    }
  };

  // Loading / auth guards
  if (status === 'loading' || isLoading || isDbLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!isConfigured) {
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
            <h1 className="text-2xl font-bold text-white">AI Providers</h1>
          </div>
          <div className="rounded-lg border border-gray-800 bg-black/50 p-8 text-center">
            <Database className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h2 className="mb-2 text-xl font-semibold text-white">
              Database Not Configured
            </h2>
            <p className="mb-6 text-gray-400">
              Complete the setup wizard to connect your database first.
            </p>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 font-medium text-navy transition-opacity hover:opacity-90"
            >
              Complete Setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasHeartbeat =
    autopilotInfo?.last_heartbeat &&
    Date.now() - new Date(autopilotInfo.last_heartbeat).getTime() <
      15 * 60 * 1000; // 15 min

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
          <h1 className="text-2xl font-bold text-white">AI Providers</h1>
          <p className="mt-1 text-gray-400">
            Manage AI provider keys for the autopilot daemon
          </p>
        </div>

        {/* Section 1: Current Configuration Status */}
        <div className="mb-6 rounded-lg border border-gray-800 bg-black/50 p-6">
          <h2 className="mb-4 text-lg font-medium text-white">
            Current Configuration
          </h2>

          {autopilotInfo?.active_provider ? (
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${hasHeartbeat ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
              <div>
                <p className="text-white">
                  <span className="font-medium">
                    {autopilotInfo.active_provider === 'claude'
                      ? 'Claude Max (OAuth)'
                      : `${autopilotInfo.active_provider.charAt(0).toUpperCase() + autopilotInfo.active_provider.slice(1)} (${autopilotInfo.active_model || 'default'})`}
                  </span>
                  <span className="ml-2 text-sm text-gray-400">
                    via{' '}
                    {SOURCE_LABELS[autopilotInfo.provider_source || ''] ||
                      autopilotInfo.provider_source}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Runtime:{' '}
                  {autopilotInfo.active_provider === 'claude'
                    ? 'Claude Agent SDK'
                    : 'Multi-Provider Runtime (Vercel AI SDK)'}
                  {autopilotInfo.last_heartbeat && (
                    <span className="ml-3">
                      Last heartbeat:{' '}
                      {formatRelativeTime(autopilotInfo.last_heartbeat)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <p className="text-gray-400">
                No provider configured. Set up a provider below or start the
                daemon.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Stored API Keys */}
        <div className="mb-6 rounded-lg border border-gray-800 bg-black/50 p-6">
          <h2 className="mb-4 text-lg font-medium text-white">
            Stored API Keys
          </h2>

          <div className="space-y-3">
            {PROVIDERS.map((provider) => {
              const stored = keys.find((k) => k.provider === provider.id);

              return (
                <div
                  key={provider.id}
                  className="rounded-lg border border-gray-800 bg-gray-900/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-gray-800 p-2">
                        <Zap
                          className={`h-5 w-5 ${stored ? 'text-gold' : 'text-gray-500'}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {provider.name}
                          </span>
                          {stored?.is_active && (
                            <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                              ACTIVE
                            </span>
                          )}
                          {stored && !stored.is_active && (
                            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-500">
                              CONFIGURED
                            </span>
                          )}
                        </div>
                        {stored ? (
                          <p className="text-sm text-gray-400">
                            {maskKey(stored.api_key)}
                            {stored.model && (
                              <span className="ml-2 text-gray-500">
                                ({stored.model})
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Not configured
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {stored && !stored.is_active && (
                        <button
                          onClick={() => handleSetActive(stored)}
                          className="rounded-md px-3 py-1 text-sm text-gold transition-colors hover:bg-gold/10"
                        >
                          Set Active
                        </button>
                      )}
                      {stored && (
                        <button
                          onClick={() => setKeyToDelete(stored)}
                          disabled={isDeletingId === stored.id}
                          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-900/20 hover:text-red-400"
                        >
                          {isDeletingId === stored.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {!stored && (
                        <button
                          onClick={() => {
                            setAddingProvider(provider.id);
                            setNewKeyValue('');
                            setError(null);
                          }}
                          className="rounded-md bg-gold/10 px-3 py-1 text-sm text-gold transition-colors hover:bg-gold/20"
                        >
                          Add Key
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline add key form */}
                  {addingProvider === provider.id && (
                    <div className="mt-3 border-t border-gray-800 pt-3 space-y-3">
                      <div className="relative">
                        <input
                          type={showNewKey ? 'text' : 'password'}
                          value={newKeyValue}
                          onChange={(e) => setNewKeyValue(e.target.value)}
                          placeholder={`Enter ${provider.name} API key`}
                          className="w-full rounded-md border border-gray-700 bg-black px-3 py-2 pr-10 font-mono text-sm text-white placeholder-gray-500 focus:border-gold focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => setShowNewKey(!showNewKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showNewKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {error && (
                        <p className="text-sm text-red-400">{error}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveKey}
                          disabled={!newKeyValue.trim() || isSaving}
                          className="rounded-md bg-gold px-4 py-1.5 text-sm font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setAddingProvider(null);
                            setNewKeyValue('');
                          }}
                          className="rounded-md px-4 py-1.5 text-sm text-gray-400 transition-colors hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Configuration Methods */}
        <div className="mb-6 rounded-lg border border-gray-800 bg-black/50 p-6">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-medium text-white">
                Configuration Methods
              </h2>
            </div>
            {showInfo ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showInfo && (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <Zap className="mt-0.5 h-5 w-5 text-gold" />
                <div>
                  <h3 className="font-medium text-white">
                    Claude Code Subscription
                  </h3>
                  <p className="text-sm text-gray-400">
                    Run{' '}
                    <code className="rounded bg-black px-1 text-gold">
                      claude setup-token
                    </code>{' '}
                    to authenticate. Uses your Claude Max subscription directly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Terminal className="mt-0.5 h-5 w-5 text-gold" />
                <div>
                  <h3 className="font-medium text-white">
                    Environment Variables
                  </h3>
                  <p className="text-sm text-gray-400">
                    Set OPENAI_API_KEY, GOOGLE_API_KEY, or ANTHROPIC_API_KEY in
                    your shell. Mason auto-detects them at startup.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-5 w-5 text-gold" />
                <div>
                  <h3 className="font-medium text-white">
                    Dashboard-Stored Keys
                  </h3>
                  <p className="text-sm text-gray-400">
                    Manage keys above. Stored in YOUR Supabase database, never
                    on Mason servers.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-3">
                <p className="text-sm text-gray-400">
                  <span className="font-medium text-white">
                    Priority order:
                  </span>{' '}
                  Claude Code OAuth &gt; Environment Variables &gt; Dashboard
                  Keys
                </p>
              </div>

              <div className="flex items-start gap-2 text-xs text-gray-500">
                <Shield className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>
                  Your API keys are stored exclusively in YOUR Supabase
                  database. Mason servers never see or store your keys.
                </span>
              </div>
            </div>
          )}
        </div>

        <PoweredByFooter />
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={!!keyToDelete}
        onClose={() => setKeyToDelete(null)}
        onConfirm={() => keyToDelete && void handleDeleteKey(keyToDelete.id)}
        title="Delete API Key"
        message="This will remove the stored API key. The daemon will fall back to other configured providers."
        itemCount={1}
        itemTitles={
          keyToDelete
            ? [
                `${keyToDelete.provider.charAt(0).toUpperCase() + keyToDelete.provider.slice(1)} - ${maskKey(keyToDelete.api_key)}`,
              ]
            : []
        }
        confirmLabel="Delete Key"
        confirmVariant="danger"
        isLoading={isDeletingId === keyToDelete?.id}
      />
    </div>
  );
}
