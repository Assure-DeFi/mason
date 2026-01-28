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
} from 'lucide-react';
import Link from 'next/link';

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
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/keys');
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys);
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchKeys();
    }
  }, [session, fetchKeys]);

  const handleCreateKey = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Default' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const data = await response.json();
      setNewKey(data.key);
      setKeys((prev) => [data.info, ...prev]);
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
    setDeletingId(id);

    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
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

  if (status === 'loading' || isLoading) {
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
      </div>

      {/* New Key Modal */}
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
                <code className="flex-1 rounded-md bg-black p-3 font-mono text-sm text-white break-all">
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
