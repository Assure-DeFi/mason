'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  Check,
  X,
  Trash2,
  AlertCircle,
  Database,
  ArrowRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';
import { TABLES } from '@/lib/constants';

type AIProvider = 'anthropic' | 'openai';

interface AIKeyInfo {
  id: string;
  provider: AIProvider;
  created_at: string;
  updated_at: string;
}

interface ValidationState {
  isValid: boolean;
  message?: string;
}

function validateAnthropicKey(key: string): ValidationState {
  if (!key) return { isValid: false };

  if (!key.startsWith('sk-ant-api03-')) {
    return {
      isValid: false,
      message: 'Should start with "sk-ant-api03-"',
    };
  }

  if (key.length < 50) {
    return {
      isValid: false,
      message: 'Key appears too short',
    };
  }

  return { isValid: true };
}

function validateOpenAIKey(key: string): ValidationState {
  if (!key) return { isValid: false };

  if (!key.startsWith('sk-')) {
    return {
      isValid: false,
      message: 'Should start with "sk-"',
    };
  }

  if (key.length < 40) {
    return {
      isValid: false,
      message: 'Key appears too short',
    };
  }

  return { isValid: true };
}

export default function AIProvidersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { client, isConfigured, isLoading: isDbLoading } = useUserDatabase();

  const [keys, setKeys] = useState<AIKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<AIProvider | null>(
    null,
  );

  // Form state for adding/updating keys
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [keyValidation, setKeyValidation] = useState<ValidationState>({
    isValid: false,
  });

  // Debounced key validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!apiKey) {
        setKeyValidation({ isValid: false });
        return;
      }

      if (selectedProvider === 'anthropic') {
        setKeyValidation(validateAnthropicKey(apiKey));
      } else {
        setKeyValidation(validateOpenAIKey(apiKey));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [apiKey, selectedProvider]);

  // Reset form when provider changes
  useEffect(() => {
    setApiKey('');
    setKeyValidation({ isValid: false });
    setSaveSuccess(false);
    setError(null);
  }, [selectedProvider]);

  const fetchKeys = useCallback(async () => {
    if (!client || !session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .select('id, provider, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setKeys(data || []);
    } catch (err) {
      console.error('Error fetching AI keys:', err);
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

  const handleTestAndSave = async () => {
    if (!client || !keyValidation.isValid || !session?.user) return;

    setIsTesting(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Test the key first
      const testResponse = await fetch('/api/ai-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      });

      const testData = await testResponse.json();

      if (!testResponse.ok) {
        throw new Error(testData.error || 'Connection test failed');
      }

      // Get user ID from mason_users table using GitHub ID
      const { data: userData, error: userError } = await client
        .from(TABLES.USERS)
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete setup first.');
      }

      // Save the key
      setIsSaving(true);
      const { error: upsertError } = await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .upsert(
          {
            user_id: userData.id,
            provider: selectedProvider,
            api_key: apiKey,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,provider',
          },
        );

      if (upsertError) {
        throw upsertError;
      }

      setSaveSuccess(true);
      setApiKey('');
      setKeyValidation({ isValid: false });
      fetchKeys();
    } catch (err) {
      console.error('Error saving AI key:', err);
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsTesting(false);
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async (provider: AIProvider) => {
    if (!client) return;

    setDeletingProvider(provider);

    try {
      const { error: deleteError } = await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .delete()
        .eq('provider', provider);

      if (deleteError) {
        throw deleteError;
      }

      setKeys((prev) => prev.filter((k) => k.provider !== provider));
    } catch (err) {
      console.error('Error deleting AI key:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    } finally {
      setDeletingProvider(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const hasKey = (provider: AIProvider) => {
    return keys.some((k) => k.provider === provider);
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

            <h1 className="text-2xl font-bold text-white">AI Providers</h1>
            <p className="mt-1 text-gray-400">
              Configure AI providers for PRD generation
            </p>
          </div>

          <div className="rounded-lg border border-gray-800 bg-black/50 p-8 text-center">
            <Database className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h2 className="mb-2 text-xl font-semibold text-white">
              Database Not Configured
            </h2>
            <p className="mb-6 text-gray-400">
              Complete the setup wizard to connect your database and configure
              AI providers.
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

          <div>
            <h1 className="text-2xl font-bold text-white">AI Providers</h1>
            <p className="mt-1 text-gray-400">
              Configure AI providers for PRD generation
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-800 bg-green-900/20 p-4 text-green-400">
            <Check className="h-5 w-5 flex-shrink-0" />
            API key saved successfully
            <button
              onClick={() => setSaveSuccess(false)}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Configured Keys */}
        <div className="mb-8 rounded-lg border border-gray-800 bg-black/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-medium text-white">
              Configured Providers
            </h2>
          </div>

          {keys.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No AI providers configured yet</p>
              <p className="mt-1 text-sm">
                Add a provider below to enable PRD generation
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
                      <Sparkles className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white capitalize">
                          {key.provider}
                        </span>
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        Updated: {formatDate(key.updated_at)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteKey(key.provider)}
                    disabled={deletingProvider === key.provider}
                    className="rounded-md p-2 text-gray-400 transition-colors hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50"
                    title="Remove key"
                  >
                    {deletingProvider === key.provider ? (
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

        {/* Add/Update Key Form */}
        <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
          <h2 className="mb-4 text-lg font-medium text-white">
            {hasKey(selectedProvider) ? 'Update' : 'Add'} Provider Key
          </h2>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('anthropic')}
                  className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 font-medium transition-all ${
                    selectedProvider === 'anthropic'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  Anthropic
                  {selectedProvider === 'anthropic' && (
                    <Check className="h-4 w-4" />
                  )}
                  {hasKey('anthropic') && selectedProvider !== 'anthropic' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider('openai')}
                  className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 font-medium transition-all ${
                    selectedProvider === 'openai'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  OpenAI
                  {selectedProvider === 'openai' && (
                    <Check className="h-4 w-4" />
                  )}
                  {hasKey('openai') && selectedProvider !== 'openai' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <label
                htmlFor="apiKey"
                className="mb-2 block text-sm font-medium text-white"
              >
                {selectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API
                Key
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    selectedProvider === 'anthropic'
                      ? 'sk-ant-api03-...'
                      : 'sk-...'
                  }
                  className={`w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                    apiKey
                      ? keyValidation.isValid
                        ? 'border-green-600 focus:border-green-500'
                        : 'border-red-600 focus:border-red-500'
                      : 'border-gray-700 focus:border-gold'
                  }`}
                />
                {apiKey && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {keyValidation.isValid ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {apiKey && !keyValidation.isValid && keyValidation.message && (
                <p className="mt-1 text-xs text-red-400">
                  {keyValidation.message}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Get your key from{' '}
                <a
                  href={
                    selectedProvider === 'anthropic'
                      ? 'https://console.anthropic.com/settings/keys'
                      : 'https://platform.openai.com/api-keys'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gold hover:underline"
                >
                  {selectedProvider === 'anthropic'
                    ? 'console.anthropic.com'
                    : 'platform.openai.com'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <button
              onClick={handleTestAndSave}
              disabled={!keyValidation.isValid || isTesting || isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isTesting || isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isTesting ? 'Testing...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Test & Save Key
                </>
              )}
            </button>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-8 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <h3 className="font-medium text-white">Privacy Note</h3>
          <p className="mt-1 text-sm text-gray-400">
            Your API keys are stored only in your own Supabase database,
            protected by Row Level Security. Assure DeFi never sees or stores
            your AI provider credentials.
          </p>
        </div>

        <PoweredByFooter />
      </div>
    </div>
  );
}
