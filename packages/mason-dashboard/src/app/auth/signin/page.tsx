'use client';

import { Github } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { MasonAvatar, MasonLogo, MasonLoader } from '@/components/brand';
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
    <div className="flex min-h-screen flex-col bg-navy">
      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Mason Character & Logo */}
          <div className="mason-entrance text-center">
            <div className="mb-6 flex justify-center">
              <MasonAvatar size="xl" variant="detailed" priority />
            </div>
            <MasonLogo
              variant="wordmark"
              size="lg"
              className="mb-2 justify-center"
            />
            <p className="text-gray-400">
              Sign in to manage your product backlog
            </p>
          </div>

          {/* Sign In Card */}
          <div
            className="mason-entrance rounded-xl border border-gray-800 bg-black/50 p-8 backdrop-blur"
            style={{ animationDelay: '0.15s' }}
          >
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-gold px-4 py-4 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <MasonLoader size="sm" variant="pulse" />
              ) : (
                <>
                  <Github className="h-5 w-5" />
                  <span>Sign in with GitHub</span>
                </>
              )}
            </button>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/10">
                  <span className="text-xs text-gold">1</span>
                </div>
                <span>Authorize GitHub access</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/10">
                  <span className="text-xs text-gold">2</span>
                </div>
                <span>Connect your own database</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/10">
                  <span className="text-xs text-gold">3</span>
                </div>
                <span>Start improving your codebase</span>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <p
            className="mason-entrance text-center text-sm text-gray-500"
            style={{ animationDelay: '0.3s' }}
          >
            Your data stays in YOUR database. We never see your code or
            improvements.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6">
        <PoweredByFooter className="justify-center" />
      </div>
    </div>
  );
}
