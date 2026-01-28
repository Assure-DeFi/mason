'use client';

import { Check } from 'lucide-react';

interface WizardStep {
  id: number;
  name: string;
  description: string;
}

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  const totalSteps = steps.length;
  const completedSteps = currentStep - 1;
  const progressPercentage = Math.round(
    (completedSteps / (totalSteps - 1)) * 100,
  );

  // Estimate time remaining (rough estimate: ~1 min per step)
  const stepsRemaining = totalSteps - currentStep;
  const estimatedMinutes = stepsRemaining > 0 ? stepsRemaining : 0;

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          Step {currentStep} of {totalSteps}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-medium text-gold">
            {progressPercentage}% complete
          </span>
          {estimatedMinutes > 0 && (
            <span className="text-gray-500">
              ~{estimatedMinutes} min{estimatedMinutes !== 1 ? 's' : ''}{' '}
              remaining
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-gold transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      <nav aria-label="Progress">
        <ol className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step, index) => {
            const isComplete = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;

            return (
              <li key={step.id} className="md:flex-1">
                <div
                  className={`flex items-center gap-4 md:flex-col md:items-start md:gap-2 ${
                    isUpcoming ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all ${
                        isComplete
                          ? 'bg-gold text-navy'
                          : isCurrent
                            ? 'border-2 border-gold bg-transparent text-gold'
                            : 'border-2 border-gray-700 bg-transparent text-gray-500'
                      }`}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : step.id}
                    </span>
                    <div className="md:hidden">
                      <p
                        className={`text-sm font-medium ${
                          isCurrent
                            ? 'text-gold'
                            : isComplete
                              ? 'text-white'
                              : 'text-gray-500'
                        }`}
                      >
                        {step.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-gold'
                          : isComplete
                            ? 'text-white'
                            : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`hidden md:block md:h-0.5 md:w-full md:flex-1 transition-colors ${
                        isComplete ? 'bg-gold' : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

export default WizardProgress;
