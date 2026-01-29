'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Key,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';

interface ApiKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { client, isConfigured, isLoading: isDbLoading } = useUserDatabase();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!client || !session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: userData } = await client
        .from('mason_users')
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (!userData) {
        setKeys([]);
        return;
      }

      const { data, error: fetchError } = await client
        .from('mason_api_keys')
        .select('id, name, key_prefix, created_at, last_used_at')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setKeys(data || []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
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
      fetchKeys();
    } else if (!isDbLoading && !isConfigured) {
      setIsLoading(false);
    }
  }, [session, fetchKeys, isConfigured, isDbLoading]);

  const handleCreateKey = async () => {
    if (!client || !session?.user) {
      setError('Database not configured');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { data: userData } = await client
        .from('mason_users')
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (!userData) {
        throw new Error('User not found');
      }

      const keyBytes = new Uint8Array(24);
      crypto.getRandomValues(keyBytes);
      const keyBytesArray = Array.from(keyBytes);
      const base64url = btoa(String.fromCharCode(...keyBytesArray))
        .replace(/[+/=]/g, (c) => (c === '+' ? '-' : c === '/' ? '_' : ''))
        .replace(/^[-_]+/, ''); // Strip leading - or _ to avoid mason__ or mason_-
      const fullKey = `mason_${base64url}`;

      const keyPrefix = fullKey.substring(0, 12);
      const encoder = new TextEncoder();
      const data = encoder.encode(fullKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { data: insertedKey, error: insertError } = await client
        .from('mason_api_keys')
        .insert({
          user_id: userData.id,
          name: 'Default',
          key_hash: keyHash,
          key_prefix: keyPrefix,
        })
        .select('id, name, key_prefix, created_at, last_used_at')
        .single();

      if (insertError) {
        throw insertError;
      }

      setNewKey(fullKey);
      setKeys((prev) => [insertedKey, ...prev]);
    } catch (err) {
      setError('Failed to create API key. Please try again.');
      console.error('Error creating API key:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyKey = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setNewKey(null);
    setCopied(false);
  };

  const handleDeleteKey = async (id: string) => {
    if (!client) {
      return;
    }

    setDeletingId(id);

    try {
      const { error: deleteError } = await client
        .from('mason_api_keys')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error('Error deleting API key:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

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

            <h1 className="text-2xl font-bold text-white">API Keys</h1>
            <p className="mt-1 text-gray-400">
              Manage API keys for CLI authentication
            </p>
          </div>

          <div className="rounded-lg border border-gray-800 bg-black/50 p-8 text-center">
            <Database className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h2 className="mb-2 text-xl font-semibold text-white">
              Database Not Configured
            </h2>
            <p className="mb-6 text-gray-400">
              Complete the setup wizard to connect your database and manage API
              keys.
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
              <h1 className="text-2xl font-bold text-white">API Keys</h1>
              <p className="mt-1 text-gray-400">
                Manage API keys for CLI authentication
              </p>
            </div>

            <button
              onClick={handleCreateKey}
              disabled={isCreating}
              className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isCreating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate API Key
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-medium text-white">Your API Keys</h2>
          </div>

          {keys.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Key className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No API keys yet</p>
              <p className="mt-1 text-sm">
                Generate a key to start using Mason from the CLI
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-gray-800 p-2">
                      <Key className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white">
                          {key.key_prefix}...
                        </span>
                        <span className="text-sm text-gray-500">
                          {key.name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-400">
                        <span>Created: {formatDate(key.created_at)}</span>
                        <span>
                          Last used: {formatRelativeTime(key.last_used_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    disabled={deletingId === key.id}
                    className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50"
                    title="Revoke key"
                  >
                    {deletingId === key.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <h3 className="font-medium text-white">Usage</h3>
          <p className="mt-1 text-sm text-gray-400">
            Use your API key with the Mason CLI:
          </p>
          <div className="mt-3 rounded-md bg-black p-3 font-mono text-sm text-gray-300">
            <code>
              curl -fsSL
              https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh
              | bash
            </code>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Then paste your API key when prompted during installation.
          </p>
        </div>

        <PoweredByFooter />
      </div>

      {newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="mx-4 w-full max-w-lg rounded-lg border border-gray-800 bg-navy p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-gold/20 p-2">
                <Key className="h-6 w-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white">
                API Key Generated
              </h3>
            </div>

            <div className="mb-4 rounded-lg border border-yellow-800/50 bg-yellow-900/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <p className="text-sm text-yellow-200">
                  Copy this key now. You will not be able to see it again.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm text-gray-400">
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-md bg-black p-3 font-mono text-sm text-white">
                  {newKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="rounded-md bg-gray-800 p-3 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full rounded-md bg-gold py-2 font-medium text-navy transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
