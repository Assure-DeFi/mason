'use client';

import {
  Check,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';


import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';

import type { WizardStepProps } from '../SetupWizard';

type AIProvider = 'anthropic' | 'openai';

interface ValidationState {
  isValid: boolean;
  message?: string;
}

function validateAnthropicKey(key: string): ValidationState {
  if (!key) {return { isValid: false };}

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
  if (!key) {return { isValid: false };}

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

export function AIProviderStep({ onNext, onBack }: WizardStepProps) {
  const { data: session } = useSession();
  const { client } = useUserDatabase();

  const [provider, setProvider] = useState<AIProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'success' | 'error' | 'skipped'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      if (provider === 'anthropic') {
        setKeyValidation(validateAnthropicKey(apiKey));
      } else {
        setKeyValidation(validateOpenAIKey(apiKey));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [apiKey, provider]);

  // Reset key when provider changes
  useEffect(() => {
    setApiKey('');
    setKeyValidation({ isValid: false });
    setSaveStatus('idle');
    setErrorMessage(null);
  }, [provider]);

  const canSave = useMemo(() => {
    return keyValidation.isValid && !isSaving && !isTesting;
  }, [keyValidation.isValid, isSaving, isTesting]);

  const handleSaveKey = async () => {
    if (!client || !canSave || !session?.user) {return;}

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Get the user ID from mason_users table using GitHub ID
      const { data: userData, error: userError } = await client
        .from(TABLES.USERS)
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please complete GitHub setup first.');
      }

      // Save to mason_ai_provider_keys table
      const { error: upsertError } = await client
        .from(TABLES.AI_PROVIDER_KEYS)
        .upsert(
          {
            user_id: userData.id,
            provider,
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

      setSaveStatus('success');
    } catch (err) {
      console.error('Error saving AI key:', err);
      setSaveStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save API key',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!canSave) {return;}

    setIsTesting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/ai-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Connection test failed');
      }

      // If test passes, save the key
      await handleSaveKey();
    } catch (err) {
      console.error('Connection test error:', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Connection test failed',
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSkip = () => {
    setSaveStatus('skipped');
    onNext();
  };

  const isComplete = saveStatus === 'success' || saveStatus === 'skipped';

  const ValidationIndicator = ({
    validation,
    value,
  }: {
    validation: ValidationState;
    value: string;
  }) => {
    if (!value) {return null;}

    return (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {validation.isValid ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">
          Connect Your AI Provider (Optional)
        </h2>
        <p className="mt-1 text-gray-400">
          Enable AI-powered PRD generation for your backlog items
        </p>
      </div>

      {/* Benefits section */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-medium text-white">
          <Sparkles className="h-5 w-5 text-gold" />
          Why configure an AI key?
        </h3>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-green-500" />
            <span>Generate detailed PRDs directly in the dashboard</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-green-500" />
            <span>
              Get more successful automated executions with clear requirements
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 text-green-500" />
            <span>Your key stays in YOUR database - we never see it</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          Cost: Minimal - each PRD generation uses ~$0.02-0.05 of API credits
        </p>
      </div>

      {/* Provider Selection */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            Select AI Provider
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider('anthropic')}
              className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 font-medium transition-all ${
                provider === 'anthropic'
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-gray-600'
              }`}
            >
              Anthropic
              {provider === 'anthropic' && <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setProvider('openai')}
              className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 font-medium transition-all ${
                provider === 'openai'
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-gray-600'
              }`}
            >
              OpenAI
              {provider === 'openai' && <Check className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-white"
            >
              {provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API Key
            </label>
            <HelpTooltip
              title="API Key"
              content={
                provider === 'anthropic'
                  ? 'Get your API key from console.anthropic.com. Starts with sk-ant-api03-'
                  : 'Get your API key from platform.openai.com. Starts with sk-'
              }
              position="right"
            />
          </div>
          <div className="relative">
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === 'anthropic' ? 'sk-ant-api03-...' : 'sk-...'
              }
              className={`w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                apiKey
                  ? keyValidation.isValid
                    ? 'border-green-600 focus:border-green-500'
                    : 'border-red-600 focus:border-red-500'
                  : 'border-gray-700 focus:border-gold'
              }`}
            />
            <ValidationIndicator validation={keyValidation} value={apiKey} />
          </div>
          {apiKey && !keyValidation.isValid && keyValidation.message && (
            <p className="mt-1 text-xs text-red-400">{keyValidation.message}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Get your key from{' '}
            <a
              href={
                provider === 'anthropic'
                  ? 'https://console.anthropic.com/settings/keys'
                  : 'https://platform.openai.com/api-keys'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gold hover:underline"
            >
              {provider === 'anthropic'
                ? 'console.anthropic.com'
                : 'platform.openai.com'}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleTestConnection}
          disabled={!canSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Test & Save Key
            </>
          )}
        </button>
      </div>

      {/* Status messages */}
      {saveStatus === 'success' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-3 text-green-400">
          <Check className="h-5 w-5" />
          <span>
            {provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key saved
            successfully
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/20 p-3 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Privacy note */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
        <h3 className="mb-2 font-medium text-white">Privacy Note</h3>
        <p className="text-sm text-gray-400">
          Your API key is stored only in your own Supabase database, protected
          by Row Level Security. Assure DeFi never sees or stores your AI
          provider credentials.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-md border border-gray-700 px-6 py-2 text-gray-300 transition-colors hover:bg-gray-900"
          >
            Back
          </button>
        )}
        <button
          onClick={handleSkip}
          className="rounded-md border border-gray-700 px-6 py-2 text-gray-300 transition-colors hover:bg-gray-900"
        >
          Skip for now
        </button>
        <button
          onClick={onNext}
          disabled={!isComplete}
          className="flex-1 rounded-md bg-gold px-6 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default AIProviderStep;
