'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { WizardProgress } from './WizardProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { DatabaseStep } from './steps/DatabaseStep';
import { GitHubStep } from './steps/GitHubStep';
import { RepoStep } from './steps/RepoStep';
import { CompleteStep } from './steps/CompleteStep';
import { PreSetupChecklist } from './PreSetupChecklist';
import { useUserDatabase } from '@/hooks/useUserDatabase';

const WIZARD_STEPS = [
  { id: 1, name: 'Welcome', description: 'Get started with Mason' },
  { id: 2, name: 'Database', description: 'Connect your Supabase' },
  { id: 3, name: 'GitHub', description: 'Sign in with GitHub' },
  { id: 4, name: 'Repository', description: 'Select a repo' },
  { id: 5, name: 'Complete', description: 'Install the CLI' },
];

export interface WizardStepProps {
  onNext: () => void;
  onBack?: () => void;
}

export function SetupWizard() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [showChecklist, setShowChecklist] = useState(true);
  const { saveConfig, config } = useUserDatabase();

  // Read step from URL on mount (for OAuth callback)
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      if (step >= 1 && step <= WIZARD_STEPS.length) {
        setCurrentStep(step);
        // Skip checklist if returning from OAuth
        setShowChecklist(false);
      }
    }
  }, [searchParams]);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleNext} />;
      case 2:
        return <DatabaseStep onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <GitHubStep onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <RepoStep onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <CompleteStep onNext={handleNext} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Pre-Setup Checklist Modal */}
      {showChecklist && (
        <PreSetupChecklist onReady={() => setShowChecklist(false)} />
      )}

      <div className="min-h-screen bg-navy px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Mason Setup</h1>
            <p className="mt-1 text-gray-400">
              Configure Mason for your private codebase analysis
            </p>
          </div>

          <div className="mb-12">
            <WizardProgress steps={WIZARD_STEPS} currentStep={currentStep} />
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
              Assure DeFi
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default SetupWizard;
