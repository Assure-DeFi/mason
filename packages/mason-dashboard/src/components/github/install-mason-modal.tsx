'use client';

import {
  X,
  Terminal,
  AlertTriangle,
  Check,
  Copy,
  Key,
  Loader2,
  FolderGit2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { TABLES } from '@/lib/constants';
import { getMasonConfig } from '@/lib/supabase/user-client';

interface InstallMasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoName?: string;
}

export function InstallMasonModal({
  isOpen,
  onClose,
  repoName,
}: InstallMasonModalProps) {
  const { data: session } = useSession();
  const { client } = useUserDatabase();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing API keys on mount
  useEffect(() => {
    if (!isOpen || !client || !session?.user) {
      setIsLoadingKeys(false);
      return;
    }

    const checkExistingKeys = async () => {
      setIsLoadingKeys(true);
      try {
        const { data: userData } = await client
          .from(TABLES.USERS)
          .select('id')
          .eq('github_id', session.user.github_id)
          .single();

        if (userData) {
          const { data: keys } = await client
            .from(TABLES.API_KEYS)
            .select('id')
            .eq('user_id', userData.id)
            .limit(1);

          setHasExistingKey(Boolean(keys && keys.length > 0));
        }
      } catch (err) {
        console.error('Error checking API keys:', err);
      } finally {
        setIsLoadingKeys(false);
      }
    };

    void checkExistingKeys();
  }, [isOpen, client, session]);

  // Generate the full install command with credentials embedded
  const installCommand = useMemo(() => {
    const currentConfig = getMasonConfig();
    if (!currentConfig || !apiKey) {
      return null;
    }

    return `MASON_SUPABASE_URL="${currentConfig.supabaseUrl}" MASON_SUPABASE_ANON_KEY="${currentConfig.supabaseAnonKey}" MASON_API_KEY="${apiKey}" bash <(curl -fsSL https://raw.githubusercontent.com/Assure-DeFi/mason/main/install.sh)`;
  }, [apiKey]);

  const generateApiKey = useCallback(async () => {
    if (!client || !session?.user) {
      setError('Database or session not available');
      return;
    }

    setIsGenerating(true);
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

      const { error: insertError } = await client.from(TABLES.API_KEYS).insert({
        user_id: userData.id,
        name: repoName ? `Install - ${repoName}` : 'CLI Install',
        key_hash: keyHash,
        key_prefix: keyPrefix,
      });

      if (insertError) {
        throw insertError;
      }

      setApiKey(fullKey);
    } catch (err) {
      console.error('Error generating API key:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to generate API key',
      );
    } finally {
      setIsGenerating(false);
    }
  }, [client, session, repoName]);

  const handleCopy = async () => {
    if (!installCommand) {
      return;
    }

    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setApiKey(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm backdrop-blur-fallback">
      <div className="mx-4 w-full max-w-2xl overflow-hidden rounded-lg border border-gray-800 bg-navy shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gold/20 p-2">
              <Terminal className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Install Mason CLI
              </h2>
              {repoName && (
                <p className="text-sm text-gray-400">
                  For repository: <span className="text-gold">{repoName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="border-b border-yellow-800/30 bg-yellow-900/20 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-200">
                Required: Run this command in your repository
              </p>
              <p className="mt-1 text-sm text-yellow-200/70">
                Mason will not work until you install it in each repository you
                want to use it with. The command must be run from the root of
                your git repository.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Generate API Key */}
          {!apiKey && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white">Generate API Key</h3>
                  <p className="text-sm text-gray-400">
                    Creates a secure key for CLI authentication
                  </p>
                </div>
              </div>

              {hasExistingKey && !isLoadingKeys && (
                <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                  <p className="text-sm text-gray-400">
                    You have existing API keys. Generating a new one for this
                    installation is recommended for better tracking.
                  </p>
                </div>
              )}

              <button
                onClick={generateApiKey}
                disabled={isGenerating || isLoadingKeys}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 font-medium text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isGenerating || isLoadingKeys ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isLoadingKeys ? 'Loading...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Generate API Key
                  </>
                )}
              </button>

              {error && (
                <div className="rounded-lg bg-red-900/20 p-3 text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Copy Install Command */}
          {apiKey && installCommand && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">
                    API Key Generated
                  </h3>
                  <p className="text-sm text-gray-400">
                    Copy the command below and run it in your repository
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 overflow-x-auto rounded-md bg-black p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <FolderGit2 className="h-4 w-4" />
                      <span>Run from your repository root:</span>
                    </div>
                    <code className="block font-mono text-xs text-gray-300 break-all">
                      {installCommand}
                    </code>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="rounded-md bg-gold p-3 text-navy transition-opacity hover:opacity-90"
                  >
                    {copied ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {copied && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-3 text-green-400">
                    <Check className="h-4 w-4" />
                    <span>Copied to clipboard</span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                <h4 className="font-medium text-white mb-2">Next Steps</h4>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-gold">1.</span>
                    <span>
                      Open your terminal and{' '}
                      <code className="rounded bg-black px-1">cd</code> to{' '}
                      {repoName ? (
                        <code className="rounded bg-black px-1">
                          {repoName}
                        </code>
                      ) : (
                        'your repository'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-gold">2.</span>
                    <span>Paste and run the command above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-medium text-gold">3.</span>
                    <span>
                      Open Claude Code and run{' '}
                      <code className="rounded bg-black px-1">/pm-review</code>
                    </span>
                  </li>
                </ol>
              </div>

              {/* Security Note */}
              <div className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-3">
                <p className="text-xs text-yellow-200/80">
                  <span className="font-medium">Security:</span> The install
                  command contains your API key. Do not share it or commit it to
                  version control.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-800 p-4">
          <button
            onClick={handleClose}
            className="rounded-md bg-gray-800 px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700"
          >
            {apiKey ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
