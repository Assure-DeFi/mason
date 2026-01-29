'use client';

import { useSession, signIn } from 'next-auth/react';
import { Github, Check, Loader2, User } from 'lucide-react';
import type { WizardStepProps } from '../SetupWizard';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import { useEffect, useState } from 'react';

export function GitHubStep({ onNext, onBack }: WizardStepProps) {
  const { data: session, status } = useSession();
  const { hasToken, isLoading: isTokenLoading } = useGitHubToken();
  const { client, isConfigured } = useUserDatabase();
  const [isTokenStored, setIsTokenStored] = useState(false);
  const [isUserRecordCreated, setIsUserRecordCreated] = useState(false);

  const isAuthenticated = status === 'authenticated' && session?.user;

  const handleSignIn = async () => {
    await signIn('github', { callbackUrl: '/setup?step=3' });
  };

  // Check if token was stored after sign-in
  useEffect(() => {
    if (hasToken && status === 'authenticated') {
      setIsTokenStored(true);
    }
  }, [hasToken, status]);

  // Create user record in mason_users after OAuth completes
  useEffect(() => {
    async function ensureUserRecord() {
      if (
        !isAuthenticated ||
        !hasToken ||
        !isConfigured ||
        !client ||
        !session?.user ||
        isUserRecordCreated
      ) {
        return;
      }

      try {
        const { error } = await client.from('mason_users').upsert(
          {
            github_id: session.user.github_id,
            github_username: session.user.github_username,
            github_email: session.user.github_email,
            github_avatar_url: session.user.github_avatar_url,
            is_active: true,
          },
          { onConflict: 'github_id' },
        );

        if (!error) {
          setIsUserRecordCreated(true);
        }
      } catch (err) {
        console.error('Error creating user record:', err);
      }
    }

    ensureUserRecord();
  }, [
    isAuthenticated,
    hasToken,
    isConfigured,
    client,
    session,
    isUserRecordCreated,
  ]);

  // Complete when authenticated, token is stored, AND user record is created
  const isComplete =
    isAuthenticated && (isTokenStored || hasToken) && isUserRecordCreated;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Connect GitHub</h2>
        <p className="mt-1 text-gray-400">
          Sign in with GitHub to authenticate and access your repositories
        </p>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        {status === 'loading' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {session.user.github_avatar_url ? (
                <img
                  src={session.user.github_avatar_url}
                  alt={session.user.github_username}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-white">Connected</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  @{session.user.github_username}
                </p>
                {session.user.github_email && (
                  <p className="text-sm text-gray-400">
                    {session.user.github_email}
                  </p>
                )}
              </div>
            </div>

            {isTokenLoading && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-900 p-3 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Securing your credentials...</span>
              </div>
            )}

            {hasToken && (
              <div className="flex items-center gap-2 rounded-lg bg-green-900/20 p-3 text-green-400">
                <Check className="h-4 w-4" />
                <span>GitHub token stored securely in your browser</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <Github className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <p className="mb-6 text-gray-400">
              Sign in with GitHub to continue. Your GitHub token will be stored
              securely in your own Supabase database.
            </p>
            <button
              onClick={handleSignIn}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 font-semibold text-navy transition-opacity hover:opacity-90"
            >
              <Github className="h-5 w-5" />
              Sign in with GitHub
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
        <h3 className="mb-2 font-medium text-white">Privacy Note</h3>
        <p className="text-sm text-gray-400">
          Your GitHub access token is stored only in your browser&apos;s
          localStorage. Assure DeFi never sees or stores your token. We only use
          GitHub OAuth for the initial authentication redirect, and your token
          goes directly to your browser.
        </p>
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

export default GitHubStep;
