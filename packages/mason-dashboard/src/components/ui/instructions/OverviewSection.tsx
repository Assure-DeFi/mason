'use client';

import {
  Terminal,
  LayoutDashboard,
  FileText,
  PlayCircle,
  Sparkles,
} from 'lucide-react';

import { FeatureCard, StepItem } from './shared';

export function OverviewSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gold/30 bg-gold/10 p-4">
        <h4 className="flex items-center gap-2 font-semibold text-gold">
          <Sparkles className="h-5 w-5" />
          What is Mason?
        </h4>
        <p className="mt-2 text-gray-300">
          Mason is an AI-powered product management tool that analyzes your
          codebase and generates prioritized improvement suggestions. It
          integrates with Claude Code to provide intelligent recommendations for
          features, fixes, and optimizations.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Key Features</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon={<Terminal className="h-5 w-5" />}
            title="Codebase Analysis"
            description="Run /pm-review in Claude Code to analyze your codebase and generate improvement suggestions"
          />
          <FeatureCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="Backlog Dashboard"
            description="View, filter, and manage all improvement suggestions in a centralized dashboard"
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="PRD Generation"
            description="Generate detailed Product Requirements Documents for any improvement item"
          />
          <FeatureCard
            icon={<PlayCircle className="h-5 w-5" />}
            title="Execute Improvements"
            description="Approve items and execute them with a single command in Claude Code"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Privacy First</h4>
        <p className="text-gray-400">
          Mason stores all your data in your own Supabase database. Your code,
          improvements, and API keys never leave your infrastructure. The
          central server only validates your identity - it never sees your
          backlog items or code.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Quick Start Flow</h4>
        <ol className="space-y-3">
          <StepItem
            number={1}
            text="Complete the setup wizard to configure your database and GitHub connection"
          />
          <StepItem
            number={2}
            text="Connect a repository from the Settings page"
          />
          <StepItem number={3} text="Install Mason CLI in your repository" />
          <StepItem
            number={4}
            text="Run /pm-review in Claude Code to analyze your codebase"
          />
          <StepItem
            number={5}
            text="Review and approve suggestions in the dashboard"
          />
          <StepItem
            number={6}
            text="Execute approved items with /execute-approved"
          />
        </ol>
      </div>
    </div>
  );
}
