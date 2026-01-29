'use client';

import {
  LogOut,
  Settings,
  User,
  Key,
  Database,
  Sparkles,
  BookOpen,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

import { InstructionsModal } from '@/components/ui/InstructionsModal';

import { SignInButton } from './sign-in-button';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-700" />;
  }

  if (!session) {
    return <SignInButton />;
  }

  const user = session.user;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-gray-800"
      >
        {user.github_avatar_url ? (
          <img
            src={user.github_avatar_url}
            alt={user.github_username}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700">
            <User className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <span className="hidden text-sm text-white md:inline">
          {user.github_username}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-md bg-black shadow-lg ring-1 ring-gray-800">
          <div className="py-1">
            <div className="border-b border-gray-800 px-4 py-2">
              <p className="text-sm font-medium text-white">
                {user.github_username}
              </p>
              {user.github_email && (
                <p className="text-xs text-gray-500">{user.github_email}</p>
              )}
            </div>

            <button
              onClick={() => {
                setShowInstructions(true);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gold hover:bg-gray-900"
            >
              <BookOpen className="h-4 w-4" />
              Instructions
            </button>

            <Link
              href="/faq"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gold hover:bg-gray-900"
              onClick={() => setIsOpen(false)}
            >
              <HelpCircle className="h-4 w-4" />
              FAQ
            </Link>

            <div className="my-1 border-t border-gray-800" />

            <Link
              href="/settings/github"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Repository Settings
            </Link>

            <Link
              href="/settings/api-keys"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
              onClick={() => setIsOpen(false)}
            >
              <Key className="h-4 w-4" />
              API Keys
            </Link>

            <Link
              href="/settings/ai-providers"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
              onClick={() => setIsOpen(false)}
            >
              <Sparkles className="h-4 w-4" />
              AI Providers
            </Link>

            <Link
              href="/settings/database"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
              onClick={() => setIsOpen(false)}
            >
              <Database className="h-4 w-4" />
              Database Settings
            </Link>

            <div className="my-1 border-t border-gray-800" />

            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </div>
  );
}
