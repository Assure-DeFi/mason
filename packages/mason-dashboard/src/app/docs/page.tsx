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
          Mason is an AI-powered codebase improvement tool that runs inside
          Claude Code. It scans your project, identifies improvements worth
          making, generates PRDs, and helps you execute them. All your data
          stays in your own database.
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
        <ol>
          <li>
            <strong>Review</strong> - Run <code>/pm-review</code> in Claude Code
            to analyze your codebase
          </li>
          <li>
            <strong>Triage</strong> - View improvements in your dashboard,
            approve what you want
          </li>
          <li>
            <strong>Execute</strong> - Run <code>/execute-approved</code> to
            implement changes
          </li>
          <li>
            <strong>Ship</strong> - Review PRs and merge
          </li>
        </ol>

        <h2>Key Features</h2>
        <ul>
          <li>
            <strong>8 Analysis Categories</strong> - Feature, UI, UX, API, Data,
            Security, Performance, Code Quality
          </li>
          <li>
            <strong>Automatic PRDs</strong> - Every improvement gets a detailed
            Product Requirements Document
          </li>
          <li>
            <strong>Risk Analysis</strong> - 6-factor risk scoring for informed
            decisions
          </li>
          <li>
            <strong>Wave-Based Execution</strong> - Parallel implementation with
            specialized agents
          </li>
          <li>
            <strong>100% Private</strong> - All data stays in YOUR Supabase
            database
          </li>
        </ul>

        <h2>Requirements</h2>
        <ul>
          <li>
            <strong>Claude Code</strong> - Mason runs as commands inside Claude
            Code
          </li>
          <li>
            <strong>Supabase Account</strong> - Free tier works fine (BYOD
            model)
          </li>
          <li>
            <strong>GitHub Account</strong> - For repository connection and
            OAuth
          </li>
        </ul>
      </div>
    </DocsLayout>
  );
}
