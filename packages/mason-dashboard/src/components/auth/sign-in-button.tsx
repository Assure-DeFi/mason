'use client';

import { Github } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

interface SignInButtonProps {
  className?: string;
  variant?: 'primary' | 'link';
}

export function SignInButton({
  className = '',
  variant = 'primary',
}: SignInButtonProps) {
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

  const baseStyles =
    'flex items-center gap-2 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50';
  const variantStyles = {
    primary: 'bg-gold px-4 py-2 text-navy hover:opacity-90',
    link: 'bg-transparent text-gold hover:underline',
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {isLoading ? (
        <div
          className={`h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${variant === 'primary' ? 'border-navy' : 'border-gold'}`}
        />
      ) : variant === 'primary' ? (
        <Github className="h-4 w-4" />
      ) : null}
      <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
    </button>
  );
}
