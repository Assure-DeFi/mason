'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Key,
  Copy,
  Check,
  Terminal,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { WizardStepProps } from '../SetupWizard';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { saveMasonConfig, getMasonConfig } from '@/lib/supabase/user-client';

export function CompleteStep({ onBack }: WizardStepProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { client, isConfigured, config, refresh } = useUserDatabase();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateApiKey = async () => {
    if (!client || !session?.user) {
      setError('Database or session not available');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data: userData } = await client
        .from('users')
        .select('id')
        .eq('github_id', session.user.github_id)
        .single();

      if (!userData) {
        throw new Error('User not found in database');
      }

      const keyBytes = new Uint8Array(24);
      crypto.getRandomValues(keyBytes);
      const keyBytesArray = Array.from(keyBytes);
      const fullKey = `mason_${btoa(String.fromCharCode(...keyBytesArray)).replace(
        /[+/=]/g,
        (c) => (c === '+' ? '-' : c === '/' ? '_' : ''),
      )}`;

      const keyPrefix = fullKey.substring(0, 12);
      const encoder = new TextEncoder();
      const data = encoder.encode(fullKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { error: insertError } = await client.from('api_keys').insert({
        user_id: userData.id,
        name: 'Setup Wizard',
        key_hash: keyHash,
        key_prefix: keyPrefix,
      });

      if (insertError) {
        throw insertError;
      }

      setApiKey(fullKey);

      const currentConfig = getMasonConfig();
      if (currentConfig) {
        saveMasonConfig({
          ...currentConfig,
          setupComplete: true,
        });
        refresh();
      }
    } catch (err) {
      console.error('Error generating API key:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to generate API key',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = () => {
    router.push('/admin/backlog');
  };

  const installCommand = `curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Setup Complete</h2>
        <p className="mt-1 text-gray-400">
          Generate an API key and install the CLI to start analyzing your
          codebase
        </p>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-gold/20 p-2">
            <Key className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-white">API Key</h3>
            <p className="text-sm text-gray-400">
              Required for CLI authentication
            </p>
          </div>
        </div>

        {!apiKey ? (
          <button
            onClick={generateApiKey}
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Key className="h-4 w-4" />
                Generate API Key
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/20 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <p className="text-sm text-yellow-200">
                  Copy this key now. You will not be able to see it again.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-black p-3 font-mono text-sm text-white">
                {apiKey}
              </code>
              <button
                onClick={() => handleCopy(apiKey)}
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
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-900/20 p-3 text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-gold/20 p-2">
            <Terminal className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Install Mason CLI</h3>
            <p className="text-sm text-gray-400">Run this in your repository</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-black p-3 font-mono text-sm text-gray-300">
              {installCommand}
            </code>
            <button
              onClick={() => handleCopy(installCommand)}
              className="flex-shrink-0 rounded-md bg-gray-800 p-3 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-gray-400">
            The installer will prompt you for your API key and Supabase
            credentials. All data is stored in YOUR database - the CLI connects
            directly to your Supabase.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
        <h3 className="mb-2 font-medium text-white">How it Works</h3>
        <ol className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="font-medium text-gold">1.</span>
            <span>
              Run <code className="rounded bg-black px-1">/pm-review</code> in
              Claude Code to analyze your codebase
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-gold">2.</span>
            <span>Improvements are saved to YOUR Supabase database</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-gold">3.</span>
            <span>
              View and approve items in the{' '}
              <button
                onClick={handleGoToDashboard}
                className="text-gold hover:underline"
              >
                Dashboard
              </button>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium text-gold">4.</span>
            <span>
              Run{' '}
              <code className="rounded bg-black px-1">/execute-approved</code>{' '}
              to implement changes
            </span>
          </li>
        </ol>
      </div>

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
          onClick={handleGoToDashboard}
          disabled={!apiKey}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gold px-6 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Go to Dashboard
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default CompleteStep;
