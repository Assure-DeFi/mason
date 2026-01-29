'use client';

import {
  Key,
  AlertCircle,
  Loader2,
  ExternalLink,
  Check,
  Monitor,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo } from 'react';

import { CopyButton } from '@/components/ui/CopyButton';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { saveMasonConfig, getMasonConfig } from '@/lib/supabase/user-client';

import type { WizardStepProps } from '../SetupWizard';

type Platform = 'macos' | 'windows' | 'linux';

export function CompleteStep({ onBack }: WizardStepProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { client, isConfigured, config: _config, refresh } = useUserDatabase();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [autoCopied, setAutoCopied] = useState(false);
  const [platform, setPlatform] = useState<Platform>('macos');

  // Auto-detect platform on mount
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setPlatform('windows');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    } else {
      setPlatform('macos');
    }
  }, []);

  // Validate config on mount and when dependencies change
  useEffect(() => {
    const currentConfig = getMasonConfig();
    if (!currentConfig?.supabaseUrl || !currentConfig?.supabaseAnonKey) {
      setConfigError(
        'Database configuration missing. Please go back to step 2 to connect Supabase.',
      );
    } else if (!isConfigured || !client) {
      setConfigError(
        'Database connection not ready. Please wait or go back to step 2.',
      );
    } else {
      setConfigError(null);
    }
  }, [isConfigured, client]);

  // Generate the full install command with credentials embedded
  const installCommand = useMemo(() => {
    const currentConfig = getMasonConfig();
    if (!currentConfig || !apiKey) {
      return null;
    }

    // Platform-specific install commands
    if (platform === 'windows') {
      return `$env:MASON_SUPABASE_URL="${currentConfig.supabaseUrl}"; $env:MASON_SUPABASE_ANON_KEY="${currentConfig.supabaseAnonKey}"; $env:MASON_API_KEY="${apiKey}"; iwr -useb https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.ps1 | iex`;
    }

    // macOS/Linux command
    return `MASON_SUPABASE_URL="${currentConfig.supabaseUrl}" MASON_SUPABASE_ANON_KEY="${currentConfig.supabaseAnonKey}" MASON_API_KEY="${apiKey}" bash <(curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh)`;
  }, [apiKey, platform]);

  // Auto-copy install command when API key is generated
  useEffect(() => {
    if (!installCommand) {return;}

    const autoCopyInstallCommand = async () => {
      try {
        await navigator.clipboard.writeText(installCommand);
        setAutoCopied(true);
        setTimeout(() => setAutoCopied(false), 3000);
      } catch (err) {
        console.debug('Auto-copy failed:', err);
      }
    };

    const timer = setTimeout(() => void autoCopyInstallCommand(), 300);
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
        .from('mason_users')
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

      const { error: insertError } = await client
        .from('mason_api_keys')
        .insert({
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

  const handleGoToDashboard = () => {
    // Add timestamp param to force RepositorySelector to refresh its data
    router.push('/admin/backlog?refresh=' + Date.now());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Install Mason CLI</h2>
        <p className="mt-1 text-gray-400">
          Generate your install command - one copy-paste to set everything up
        </p>
      </div>

      {/* Config Error */}
      {configError && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
            <div>
              <p className="text-yellow-300">{configError}</p>
              <button
                onClick={onBack}
                className="mt-2 text-sm text-gold underline hover:no-underline"
              >
                Go back to fix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Selection */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Monitor className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            Select your operating system
          </span>
        </div>
        <div className="flex gap-2">
          {(['macos', 'windows', 'linux'] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                platform === p
                  ? 'bg-gold text-navy'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {p === 'macos' ? 'macOS' : p === 'windows' ? 'Windows' : 'Linux'}
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Generate API Key */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${apiKey ? 'bg-green-600 text-white' : 'bg-gold text-navy'}`}
          >
            {apiKey ? <Check className="h-5 w-5" /> : '1'}
          </div>
          <div>
            <h3 className="font-semibold text-white">Generate API Key</h3>
            <p className="text-sm text-gray-400">
              Creates a secure key for CLI authentication
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
          <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-3 text-green-400">
            <Check className="h-5 w-5" />
            <span>API key generated and included in install command below</span>
          </div>
        )}

        {error && (
          <div className="mt-4 space-y-2">
            <div className="rounded-lg bg-red-900/20 p-3 text-red-400">
              {error}
            </div>
            <button
              onClick={generateApiKey}
              className="text-sm text-gold underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Copy Install Command */}
      <div
        className={`rounded-lg border p-6 transition-opacity ${apiKey ? 'border-gold bg-gray-900/50' : 'border-gray-700 bg-gray-900/30 opacity-50'}`}
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${apiKey ? 'bg-gold text-navy' : 'bg-gray-700 text-gray-400'}`}
          >
            2
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Copy Install Command</h3>
            <p className="text-sm text-gray-400">
              Run this in your project directory
            </p>
          </div>
          {autoCopied && (
            <div className="flex items-center gap-1 text-sm text-green-400">
              <Check className="h-4 w-4" />
              Copied!
            </div>
          )}
        </div>

        {apiKey && installCommand ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <code className="flex-1 overflow-x-auto rounded-md bg-black p-3 font-mono text-xs text-gray-300">
                {installCommand}
              </code>
              <CopyButton
                text={installCommand}
                variant="default"
                size="lg"
                showToast
                toastMessage="Install command copied - paste in your terminal!"
              />
            </div>

            <div className="rounded-lg border border-green-800/50 bg-green-900/20 p-3">
              <p className="text-sm text-green-300">
                This command includes all your credentials. Just paste it in
                your project&apos;s terminal - no additional setup needed.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-800/50 p-4 text-center text-gray-500">
            Generate an API key first to get your install command
          </div>
        )}
      </div>

      {/* Security Note */}
      {apiKey && (
        <div className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
            <div className="text-sm text-yellow-200">
              <p className="font-medium">Security Note</p>
              <p className="mt-1 text-yellow-200/80">
                The install command contains your API key. Don&apos;t share it
                or commit it to version control. The key is stored securely in
                your local mason.config.json file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* How it Works */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
        <h3 className="mb-2 font-medium text-white">After Installation</h3>
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
