'use client';

import {
  ArrowRight,
  Terminal,
  LayoutDashboard,
  Shield,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { DocsLayout } from '@/components/docs';

export default function DocsPage() {
  const sections = [
    {
      icon: Zap,
      title: 'Quick Start',
      description: 'Get Mason running in 5 minutes',
      href: '/docs/quickstart',
    },
    {
      icon: Terminal,
      title: 'Commands',
      description: 'Learn about /pm-review and /execute-approved',
      href: '/docs/commands',
    },
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      description: 'Manage your backlog and track execution',
      href: '/docs/dashboard',
    },
    {
      icon: Shield,
      title: 'Privacy',
      description: 'Understand the BYOD architecture',
      href: '/docs/privacy',
    },
  ];

  return (
    <DocsLayout
      title="Mason Documentation"
      description="Everything you need to know about using Mason to improve your codebase."
    >
      {/* Hero card */}
      <div className="not-prose mb-12 rounded-xl border border-gold/30 bg-gold/5 p-8">
        <h2 className="mb-4 text-2xl font-bold text-white">What is Mason?</h2>
        <p className="mb-6 text-gray-300">
          Mason is an AI-powered codebase improvement system that runs inside
          Claude Code. It scans your project, surfaces improvements worth
          making, generates detailed PRDs for each one, and helps you execute
          them with wave-based parallel implementation. Your code never leaves
          your machine, and all data stays in your own database.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/docs/quickstart"
            className="group flex items-center gap-2 rounded-lg bg-gold px-4 py-2 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/docs/concepts"
            className="rounded-lg border border-gray-700 px-4 py-2 font-medium text-white transition-colors hover:border-gray-600 hover:bg-white/5"
          >
            How it Works
          </Link>
        </div>
      </div>

      {/* Section cards */}
      <div className="not-prose grid gap-6 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-lg border border-gray-800 bg-black/30 p-6 transition-all hover:border-gold/50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 transition-colors group-hover:bg-gold/20">
              <section.icon className="h-5 w-5 text-gold" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              {section.title}
            </h3>
            <p className="text-sm text-gray-400">{section.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick overview */}
      <div className="mt-12">
        <h2>The Mason Workflow</h2>
        <p>
          Mason follows a simple four-step cycle that puts you in control at
          every stage:
        </p>
        <ol>
          <li>
            <strong>Review</strong> — Run <code>/pm-review</code> in Claude Code
            to scan your codebase for improvements across 8 categories
          </li>
          <li>
            <strong>Triage</strong> — Browse suggestions in your dashboard, read
            the auto-generated PRDs, and approve the ones worth building
          </li>
          <li>
            <strong>Execute</strong> — Run <code>/execute-approved</code> and
            watch Mason implement your approved items with wave-based execution
          </li>
          <li>
            <strong>Ship</strong> — Review the pull requests, run your tests,
            and merge when ready
          </li>
        </ol>

        <h2>Key Features</h2>
        <p>Everything you need to continuously improve your codebase:</p>
        <ul>
          <li>
            <strong>8 Analysis Categories</strong> — Feature, UI, UX, API, Data,
            Security, Performance, and Code Quality specialists working in
            parallel
          </li>
          <li>
            <strong>Automatic PRDs</strong> — Every improvement comes with a
            complete Product Requirements Document including user stories, task
            breakdown, and success criteria
          </li>
          <li>
            <strong>Risk Analysis</strong> — 6-factor risk scoring helps you
            make informed decisions about what to build first
          </li>
          <li>
            <strong>Wave-Based Execution</strong> — Specialized agents handle
            exploration, implementation, and validation in parallel
          </li>
          <li>
            <strong>100% Private</strong> — All your data stays in YOUR Supabase
            database. We never see your code or improvements.
          </li>
        </ul>

        <h2>Requirements</h2>
        <p>Getting started takes just a few minutes with these three tools:</p>
        <ul>
          <li>
            <strong>Claude Code</strong> — Mason runs as slash commands inside
            the Claude Code CLI
          </li>
          <li>
            <strong>Supabase Account</strong> — Your private database for all
            Mason data (free tier works perfectly)
          </li>
          <li>
            <strong>GitHub Account</strong> — For OAuth sign-in and repository
            connections
          </li>
        </ul>
      </div>
    </DocsLayout>
  );
}
