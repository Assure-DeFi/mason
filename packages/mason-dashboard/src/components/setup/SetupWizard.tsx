'use client';

import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, useCallback, useEffect } from 'react';

import { useUserDatabase } from '@/hooks/useUserDatabase';
import { STORAGE_KEYS } from '@/lib/constants';

import { CompleteStep } from './steps/CompleteStep';
import { DatabaseStep } from './steps/DatabaseStep';
import { GitHubStep } from './steps/GitHubStep';
import { RepoStep } from './steps/RepoStep';
import { SupabaseConnectStep } from './steps/SupabaseConnectStep';
import { WizardProgress } from './WizardProgress';

// Streamlined setup flow: GitHub -> Supabase -> Repo -> Done
const WIZARD_STEPS = [
  { id: 1, name: 'GitHub', description: 'Connect your account' },
  { id: 2, name: 'Supabase', description: 'Connect your database' },
  { id: 3, name: 'Repository', description: 'Select a repo' },
  { id: 4, name: 'Complete', description: 'Install the CLI' },
];

// Legacy steps for manual setup flow (fallback when OAuth not available)
const LEGACY_WIZARD_STEPS = [
  { id: 1, name: 'GitHub', description: 'Connect your account' },
  { id: 2, name: 'Database', description: 'Enter credentials' },
  { id: 3, name: 'Repository', description: 'Select a repo' },
  { id: 4, name: 'Complete', description: 'Install the CLI' },
];

export interface WizardStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export function SetupWizard() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [useLegacyFlow, setUseLegacyFlow] = useState(false);
  const { saveConfig: _saveConfig, config: _config } = useUserDatabase();

  // Get current steps based on flow type
  const currentSteps = useLegacyFlow ? LEGACY_WIZARD_STEPS : WIZARD_STEPS;

  // Listen for legacy setup event from SupabaseConnectStep
  useEffect(() => {
    const handleLegacySetup = () => {
      setUseLegacyFlow(true);
    };

    window.addEventListener('use-legacy-db-setup', handleLegacySetup);
    return () => {
      window.removeEventListener('use-legacy-db-setup', handleLegacySetup);
    };
  }, []);

  // Read step from URL on mount (for OAuth callback)
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      if (step >= 1 && step <= currentSteps.length) {
        setCurrentStep(step);
      }
    }
  }, [searchParams, currentSteps.length]);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, currentSteps.length));
  }, [currentSteps.length]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleStartOver = useCallback(() => {
    // Clear all stored state
    localStorage.removeItem('mason-config');
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_OAUTH_SESSION);
    // Sign out and reload
    void signOut({ redirect: false }).then(() => {
      setCurrentStep(1);
      window.location.reload();
    });
  }, []);

  const renderStep = () => {
    if (useLegacyFlow) {
      // Legacy flow: GitHub -> Manual DB -> Repo -> Complete
      switch (currentStep) {
        case 1:
          return <GitHubStep onNext={handleNext} />;
        case 2:
          return <DatabaseStep onNext={handleNext} onBack={handleBack} />;
        case 3:
          return <RepoStep onNext={handleNext} onBack={handleBack} />;
        case 4:
          return <CompleteStep onNext={handleNext} onBack={handleBack} />;
        default:
          return null;
      }
    }

    // Streamlined OAuth flow: GitHub -> Supabase (OAuth + auto-setup) -> Repo -> Complete
    switch (currentStep) {
      case 1:
        return <GitHubStep onNext={handleNext} />;
      case 2:
        return <SupabaseConnectStep onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <RepoStep onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <CompleteStep onNext={handleNext} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-navy px-4 py-8">
      <div className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Mason Setup</h1>
          <p className="mt-1 text-gray-400">
            Configure Mason for your private codebase analysis
          </p>
        </div>

        <div className="mb-12">
          <WizardProgress steps={currentSteps} currentStep={currentStep} />
        </div>

        <div className="rounded-lg border border-gray-800 bg-black/50 p-6">
          {renderStep()}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Powered by{' '}
          <a
            href="https://assuredefi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold hover:underline"
          >
            Assure DeFi®
          </a>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleStartOver}
            className="text-xs text-gray-500 underline hover:text-gray-400"
          >
            Having trouble? Start over
          </button>
        </div>
      </div>
    </div>
  );
}

export default SetupWizard;
