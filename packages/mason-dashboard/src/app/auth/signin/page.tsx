'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';
import { useState } from 'react';
import { PoweredByFooter } from '@/components/ui/PoweredByFooter';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('github', { callbackUrl: '/admin/backlog' });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Mason</h1>
          <p className="mt-2 text-gray-400">
            Sign in to manage your product backlog
          </p>
        </div>

        <div className="mt-8 rounded-lg bg-black p-8">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-gold px-4 py-3 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-navy border-t-transparent" />
            ) : (
              <Github className="h-5 w-5" />
            )}
            <span>{isLoading ? 'Signing in...' : 'Sign in with GitHub'}</span>
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            You&apos;ll be redirected to GitHub to authorize access
          </p>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>
            By signing in, you grant Mason access to your repositories for
            executing approved improvements.
          </p>
        </div>

        <PoweredByFooter className="justify-center" />
      </div>
    </div>
  );
}
