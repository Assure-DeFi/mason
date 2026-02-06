'use client';

import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Zap,
  Terminal,
  Database,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';

import type { WizardStepProps } from '../SetupWizard';

type ProviderMethod = 'claude_oauth' | 'env_var' | 'database';
type ProviderName = 'anthropic' | 'openai' | 'google';

const PROVIDERS: { id: ProviderName; name: string; envVar: string }[] = [
  { id: 'anthropic', name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY' },
  { id: 'openai', name: 'OpenAI', envVar: 'OPENAI_API_KEY' },
  { id: 'google', name: 'Google', envVar: 'GOOGLE_API_KEY' },
];

const DEFAULT_MODELS: Record<ProviderName, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.5-pro',
};

export function ProviderStep({ onNext, onBack }: WizardStepProps) {
  const { data: session } = useSession();
  const { client } = useUserDatabase();

  const [selectedMethod, setSelectedMethod] =
    useState<ProviderMethod | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderName>('openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveKey = async () => {
    if (!client || !session?.user || !apiKey.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data: userData } = await client
        .from(TABLES.USERS)
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (!userData) {
        throw new Error('User not found in database');
      }

      // Upsert the key (replace if provider already exists)
      const { error: upsertError } = await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .upsert(
          {
            user_id: userData.id,
            provider: selectedProvider,
            api_key: apiKey.trim(),
            model: DEFAULT_MODELS[selectedProvider],
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
        .eq('user_id', userData.id)
        .neq('provider', selectedProvider);

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setIsSaving(false);
    }
  };

  const canContinue =
    selectedMethod === 'claude_oauth' ||
    selectedMethod === 'env_var' ||
    (selectedMethod === 'database' && saved);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">AI Provider</h2>
        <p className="mt-1 text-gray-400">
          Choose how Mason connects to an AI model
        </p>
      </div>

      {/* Option A: Claude Code */}
      <button
        onClick={() => setSelectedMethod('claude_oauth')}
        className={`w-full rounded-lg border p-4 text-left transition-colors ${
          selectedMethod === 'claude_oauth'
            ? 'border-gold bg-gold/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-1 rounded-lg p-2 ${selectedMethod === 'claude_oauth' ? 'bg-gold/20' : 'bg-gray-800'}`}
          >
            <Zap
              className={`h-5 w-5 ${selectedMethod === 'claude_oauth' ? 'text-gold' : 'text-gray-400'}`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">
                Claude Code Subscription
              </h3>
              {selectedMethod === 'claude_oauth' && (
                <Check className="h-4 w-4 text-gold" />
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400">
              I have a Claude Max or Team subscription. No API key needed - Mason
              uses your Claude Code authentication automatically.
            </p>
          </div>
        </div>
      </button>

      {/* Option B: Environment Variable */}
      <button
        onClick={() => setSelectedMethod('env_var')}
        className={`w-full rounded-lg border p-4 text-left transition-colors ${
          selectedMethod === 'env_var'
            ? 'border-gold bg-gold/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-1 rounded-lg p-2 ${selectedMethod === 'env_var' ? 'bg-gold/20' : 'bg-gray-800'}`}
          >
            <Terminal
              className={`h-5 w-5 ${selectedMethod === 'env_var' ? 'text-gold' : 'text-gray-400'}`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">
                Environment Variable
              </h3>
              {selectedMethod === 'env_var' && (
                <Check className="h-4 w-4 text-gold" />
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400">
              I already have an API key set in my shell environment. Mason
              auto-detects OPENAI_API_KEY, GOOGLE_API_KEY, or
              ANTHROPIC_API_KEY.
            </p>
          </div>
        </div>
      </button>

      {/* Option C: Enter Key */}
      <button
        onClick={() => setSelectedMethod('database')}
        className={`w-full rounded-lg border p-4 text-left transition-colors ${
          selectedMethod === 'database'
            ? 'border-gold bg-gold/10'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-1 rounded-lg p-2 ${selectedMethod === 'database' ? 'bg-gold/20' : 'bg-gray-800'}`}
          >
            <Database
              className={`h-5 w-5 ${selectedMethod === 'database' ? 'text-gold' : 'text-gray-400'}`}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Enter an API Key</h3>
              {selectedMethod === 'database' && saved && (
                <Check className="h-4 w-4 text-gold" />
              )}
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Provide an API key to store securely in your database. Supports
              Anthropic, OpenAI, and Google.
            </p>
          </div>
        </div>
      </button>

      {/* Key entry form (expanded when "Enter an API Key" selected) */}
      {selectedMethod === 'database' && !saved && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4 space-y-4">
          {/* Provider selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Provider
            </label>
            <div className="flex gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    selectedProvider === p.id
                      ? 'bg-gold text-navy'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* API key input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${PROVIDERS.find((p) => p.id === selectedProvider)?.name} API key`}
                className="w-full rounded-md border border-gray-700 bg-black px-3 py-2 pr-10 font-mono text-sm text-white placeholder-gray-500 focus:border-gold focus:outline-none"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleSaveKey}
            disabled={!apiKey.trim() || isSaving}
            className="w-full rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Key'
            )}
          </button>
        </div>
      )}

      {/* Success confirmation for saved key */}
      {selectedMethod === 'database' && saved && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 p-4">
          <div className="flex items-center gap-2 text-green-400">
            <Check className="h-5 w-5" />
            <span className="font-medium">
              {PROVIDERS.find((p) => p.id === selectedProvider)?.name} key saved
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {apiKey.slice(0, 12)}...{apiKey.slice(-4)} stored in your database
          </p>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-xs text-gray-500">
        <Shield className="mt-0.5 h-3 w-3 flex-shrink-0" />
        <span>
          Your API keys are stored exclusively in YOUR Supabase database. Mason
          servers never see or store your keys.
        </span>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-md border border-gray-700 px-6 py-2 text-gray-300 transition-colors hover:bg-gray-900"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 rounded-md bg-gold px-6 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default ProviderStep;
