'use client';

import { clsx } from 'clsx';
import { Github, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { SignInButton } from '@/components/auth/sign-in-button';
import { MasonMark } from '@/components/brand';

interface LandingHeaderProps {
  className?: string;
  showCTA?: boolean;
}

/**
 * Landing page header with navigation
 */
export function LandingHeader({
  className,
  showCTA = true,
}: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/docs', label: 'Docs' },
    { href: '/security', label: 'Security' },
    {
      href: 'https://github.com/Assure-DeFi/mason',
      label: 'GitHub',
      external: true,
      icon: Github,
    },
  ];

  return (
    <header
      className={clsx(
        'sticky top-0 z-50 border-b border-gray-800/50 bg-navy/95 backdrop-blur-sm',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <MasonMark
              size="sm"
              className="transition-transform group-hover:scale-105"
            />
            <span className="mason-wordmark text-lg font-bold tracking-wider text-white">
              MASON
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
              >
                {link.icon && <link.icon className="h-4 w-4" />}
                {link.label}
              </Link>
            ))}
            <div className="h-4 w-px bg-gray-700" />
            <SignInButton variant="link" />
            {showCTA && (
              <Link
                href="/setup"
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
              >
                Start with Mason
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-800 py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              ))}
              <div className="h-px bg-gray-800" />
              <SignInButton variant="link" />
              {showCTA && (
                <Link
                  href="/setup"
                  className="rounded-lg bg-gold px-4 py-2 text-center text-sm font-semibold text-navy transition-opacity hover:opacity-90"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Start with Mason
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
