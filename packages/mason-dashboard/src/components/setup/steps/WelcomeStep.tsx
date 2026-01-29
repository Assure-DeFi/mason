'use client';

import { Shield, Database, Github, Key, ArrowRight } from 'lucide-react';

import { MasonAvatar, MasonLogo } from '@/components/brand';

import type { WizardStepProps } from '../SetupWizard';

export function WelcomeStep({ onNext }: WizardStepProps) {
  return (
    <div className="space-y-8">
      {/* Hero with Mason Character */}
      <div className="mason-entrance text-center">
        <div className="mb-6 flex justify-center">
          <MasonAvatar size="xl" variant="detailed" priority />
        </div>
        <MasonLogo
          variant="wordmark"
          size="lg"
          className="mb-2 justify-center"
        />
        <p className="mt-2 text-gray-400">
          A free, open-source tool from Assure DeFi® for continuous codebase
          improvement
        </p>
      </div>

      {/* Privacy Banner */}
      <div
        className="mason-entrance rounded-xl border border-gold/30 bg-gold/5 p-6"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-lg bg-gold/10 p-2">
            <Shield className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-gold">
              Your Data Stays 100% Private
            </h3>
            <p className="mt-1 text-sm text-gray-300">
              Mason stores all your data in your own Supabase database. Assure
              DeFi® has zero access to your repositories, improvements, or any
              other data. We only host the UI - everything else stays with you.
            </p>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="mason-entrance" style={{ animationDelay: '0.2s' }}>
        <h3 className="mb-4 text-lg font-medium text-white">
          What you will need
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
              <Github className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="font-medium text-white">GitHub Account</p>
              <p className="text-sm text-gray-400">
                For authentication and repository access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
              <Database className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="font-medium text-white">Supabase Account (Free)</p>
              <p className="text-sm text-gray-400">
                Your private database for storing all Mason data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-black/30 p-4 transition-all hover:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
              <Key className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="font-medium text-white">Claude Code CLI</p>
              <p className="text-sm text-gray-400">
                We will help you install this at the end
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mason-entrance pt-4" style={{ animationDelay: '0.3s' }}>
        <button
          onClick={onNext}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-6 py-4 font-semibold text-navy transition-all hover:shadow-lg hover:shadow-gold/20"
        >
          Get Started
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

export default WelcomeStep;
