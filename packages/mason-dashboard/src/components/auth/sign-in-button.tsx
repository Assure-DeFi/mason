'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';
import { useState } from 'react';

interface SignInButtonProps {
  className?: string;
}

export function SignInButton({ className = '' }: SignInButtonProps) {
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
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`flex items-center gap-2 rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      ) : (
        <Github className="h-4 w-4" />
      )}
      <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
    </button>
  );
}
