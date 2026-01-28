'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Key,
  Terminal,
  AlertCircle,
  Loader2,
  ExternalLink,
  Download,
  Check,
} from 'lucide-react';
import type { WizardStepProps } from '../SetupWizard';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { saveMasonConfig, getMasonConfig } from '@/lib/supabase/user-client';
import { CopyButton } from '@/components/ui/CopyButton';

export function CompleteStep({ onBack }: WizardStepProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { client, isConfigured, config, refresh } = useUserDatabase();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCopied, setAutoCopied] = useState(false);

  const installCommand = `curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh | bash`;

  // Auto-copy install command when step mounts
  useEffect(() => {
    const autoCopyInstallCommand = async () => {
      try {
        await navigator.clipboard.writeText(installCommand);
        setAutoCopied(true);
        setTimeout(() => setAutoCopied(false), 3000);
      } catch (err) {
        // Clipboard might not be available, that's okay
        console.debug('Auto-copy failed:', err);
      }
    };

    // Small delay to ensure the step is visible
    const timer = setTimeout(autoCopyInstallCommand, 500);
    return () => clearTimeout(timer);
  }, [installCommand]);

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
      const fullKey = `mason_${btoa(
        String.fromCharCode(...keyBytesArray),
      ).replace(/[+/=]/g, (c) => (c === '+' ? '-' : c === '/' ? '_' : ''))}`;

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

  // Generate config file content
  const generateConfigContent = useCallback(() => {
    const currentConfig = getMasonConfig();
    if (!currentConfig || !apiKey) return null;

    return JSON.stringify(
      {
        supabaseUrl: currentConfig.supabaseUrl,
        supabaseAnonKey: currentConfig.supabaseAnonKey,
        apiKey: apiKey,
      },
      null,
      2,
    );
  }, [apiKey]);

  // Download config file
  const handleDownloadConfig = useCallback(() => {
    const configContent = generateConfigContent();
    if (!configContent) return;

    const blob = new Blob([configContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mason.config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateConfigContent]);

  const handleGoToDashboard = () => {
    router.push('/admin/backlog');
  };

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
              <CopyButton
                text={apiKey}
                variant="default"
                size="lg"
                showToast
                toastMessage="API key copied to clipboard"
              />
            </div>

            {/* Download Config Button */}
            <button
              onClick={handleDownloadConfig}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              Download Config File (mason.config.json)
            </button>
            <p className="text-xs text-gray-500 text-center">
              Place this file in your project root to skip manual credential
              entry
            </p>
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
          <div className="flex-1">
            <h3 className="font-semibold text-white">Install Mason CLI</h3>
            <p className="text-sm text-gray-400">Run this in your repository</p>
          </div>
          {autoCopied && (
            <div className="flex items-center gap-1 text-sm text-green-400">
              <Check className="h-4 w-4" />
              Auto-copied!
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-black p-3 font-mono text-sm text-gray-300">
              {installCommand}
            </code>
            <CopyButton
              text={installCommand}
              variant="default"
              size="lg"
              showToast
              toastMessage="Install command copied"
            />
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
