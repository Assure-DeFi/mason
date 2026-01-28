'use client';

import { Shield, Database, Github, Key } from 'lucide-react';
import type { WizardStepProps } from '../SetupWizard';

export function WelcomeStep({ onNext }: WizardStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Welcome to Mason</h2>
        <p className="mt-2 text-gray-400">
          A free, open-source tool from Assure DeFi for continuous codebase
          improvement
        </p>
      </div>

      <div className="rounded-lg border border-gold/30 bg-gold/5 p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-6 w-6 flex-shrink-0 text-gold" />
          <div>
            <h3 className="font-semibold text-gold">
              Your Data Stays 100% Private
            </h3>
            <p className="mt-1 text-sm text-gray-300">
              Mason stores all your data in your own Supabase database. Assure
              DeFi has zero access to your repositories, improvements, or any
              other data. We only host the UI - everything else stays with you.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium text-white">
          What you will need
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-4">
            <Github className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-white">GitHub Account</p>
              <p className="text-sm text-gray-400">
                For authentication and repository access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-4">
            <Database className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-white">Supabase Account (Free)</p>
              <p className="text-sm text-gray-400">
                Your private database for storing all Mason data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-4">
            <Key className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium text-white">Claude Code CLI</p>
              <p className="text-sm text-gray-400">
                We will help you install this at the end
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={onNext}
          className="w-full rounded-md bg-gold px-6 py-3 font-semibold text-navy transition-opacity hover:opacity-90"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

export default WelcomeStep;
