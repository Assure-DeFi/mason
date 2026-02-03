'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Sparkles,
  Zap,
  Rocket,
  Target,
  Clock,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Shield,
  Gauge,
  Code2,
  Database,
  Palette,
  Users,
  Layers,
} from 'lucide-react';
import { useState, useEffect } from 'react';

type GoalType = 'banger' | 'full' | 'quick' | 'area';
type AreaType =
  | 'feature'
  | 'ui'
  | 'ux'
  | 'api'
  | 'data'
  | 'security'
  | 'performance'
  | 'code-quality';
type FocusArea =
  | 'none'
  | 'auth'
  | 'dashboard'
  | 'api'
  | 'database'
  | 'components'
  | 'custom';

interface GenerateIdeasWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'full' | 'banger';
}

const GOALS = [
  {
    id: 'banger' as GoalType,
    icon: Zap,
    title: 'Find ONE Game-Changing Idea',
    subtitle: 'Deep dive for a transformative feature',
    description:
      'Mason analyzes your entire codebase, generates 10 big ideas, then selects THE BEST one. Perfect when you want quality over quantity.',
    output: '1 banger idea',
    time: '~5 min',
    highlight: true,
  },
  {
    id: 'full' as GoalType,
    icon: Rocket,
    title: 'Full Codebase Review',
    subtitle: 'Comprehensive analysis across all domains',
    description:
      '8 specialized agents analyze your codebase in parallel - features, UI, UX, API, data, security, performance, and code quality.',
    output: '25 items (24 + 1 banger)',
    time: '~10 min',
  },
  {
    id: 'quick' as GoalType,
    icon: Clock,
    title: 'Quick Wins',
    subtitle: 'Fast scan for top priorities',
    description:
      'Same 8 agents, but each returns only their single best finding. Great for a quick pulse check or when time is limited.',
    output: '9 items (8 + 1 banger)',
    time: '~3 min',
  },
  {
    id: 'area' as GoalType,
    icon: Target,
    title: 'Focus on Specific Area',
    subtitle: 'Deep dive into one domain',
    description:
      'Run a single specialized agent to get 5 focused recommendations in one area. Choose from security, performance, UI, and more.',
    output: '5 items',
    time: '~2 min',
  },
];

const AREAS = [
  {
    id: 'feature' as AreaType,
    icon: Sparkles,
    label: 'Features',
    description: 'Net-new functionality opportunities',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  {
    id: 'ui' as AreaType,
    icon: Palette,
    label: 'UI',
    description: 'Visual changes, components, styling',
    color: 'text-gold',
    bg: 'bg-gold/10',
    border: 'border-gold/30',
  },
  {
    id: 'ux' as AreaType,
    icon: Users,
    label: 'UX',
    description: 'User flows, friction reduction',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  {
    id: 'api' as AreaType,
    icon: Layers,
    label: 'API',
    description: 'Endpoints, backend services',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  {
    id: 'data' as AreaType,
    icon: Database,
    label: 'Data',
    description: 'Database schema, queries',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    id: 'security' as AreaType,
    icon: Shield,
    label: 'Security',
    description: 'Vulnerabilities, auth hardening',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  {
    id: 'performance' as AreaType,
    icon: Gauge,
    label: 'Performance',
    description: 'Speed, optimization, caching',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  {
    id: 'code-quality' as AreaType,
    icon: Code2,
    label: 'Code Quality',
    description: 'Tech debt, refactors, cleanup',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
];

const FOCUS_OPTIONS = [
  {
    value: 'none' as FocusArea,
    label: 'Entire codebase',
    description: 'Analyze everything',
  },
  {
    value: 'auth' as FocusArea,
    label: 'Authentication',
    description: 'Login, signup, sessions',
  },
  {
    value: 'dashboard' as FocusArea,
    label: 'Dashboard',
    description: 'Admin panels, data views',
  },
  {
    value: 'api' as FocusArea,
    label: 'API Layer',
    description: 'Routes, controllers',
  },
  {
    value: 'database' as FocusArea,
    label: 'Database',
    description: 'Queries, migrations',
  },
  {
    value: 'components' as FocusArea,
    label: 'UI Components',
    description: 'Reusable elements',
  },
  {
    value: 'custom' as FocusArea,
    label: 'Custom path...',
    description: 'Specify your own',
  },
];

export function GenerateIdeasWizard({
  isOpen,
  onClose,
  initialMode = 'full',
}: GenerateIdeasWizardProps) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<GoalType | null>(
    initialMode === 'banger' ? 'banger' : null,
  );
  const [area, setArea] = useState<AreaType | null>(null);
  const [focusArea, setFocusArea] = useState<FocusArea>('none');
  const [customFocus, setCustomFocus] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialMode === 'banger') {
        setGoal('banger');
        setStep(3); // Skip to focus step (step 3) for banger
      } else {
        setGoal(null);
        setStep(1);
      }
      setArea(null);
      setFocusArea('none');
      setCustomFocus('');
      setCopied(false);
    }
  }, [isOpen, initialMode]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  // All modes: step 1=goal, step 2=area (area mode only), step 3=focus, step 4=review
  // Non-area modes skip step 2 (display as 2 steps: focus, review)
  const displayTotalSteps = goal === 'area' ? 3 : 2;
  const displayStep =
    goal === 'area'
      ? step - 1 // area mode: 2,3,4 → display 1,2,3
      : step === 3
        ? 1
        : 2; // other modes: 3→1, 4→2

  const generateCommand = (): string => {
    let cmd = '/pm-review';

    if (goal === 'banger') {
      cmd += ' banger';
    } else if (goal === 'quick') {
      cmd += ' quick';
    } else if (goal === 'area' && area) {
      cmd += ` area:${area}`;
    }
    // full mode has no suffix

    const focusText = getFocusText();
    if (focusText) {
      cmd += `\n\nFocus on: ${focusText}`;
    }

    return cmd;
  };

  const getFocusText = (): string => {
    if (focusArea === 'none') {
      return '';
    }
    if (focusArea === 'custom') {
      return customFocus;
    }
    return FOCUS_OPTIONS.find((f) => f.value === focusArea)?.label || '';
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoalSelect = (selectedGoal: GoalType) => {
    setGoal(selectedGoal);
    if (selectedGoal === 'area') {
      setStep(2); // Go to area selection
    } else {
      setStep(3); // Skip area selection, go to focus (step 3)
    }
  };

  const handleAreaSelect = (selectedArea: AreaType) => {
    setArea(selectedArea);
    setStep(3);
  };

  const handleNext = () => {
    // Step 3 (focus) → Step 4 (review)
    if (step === 3) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      // Area selection → Goal selection
      setStep(1);
      setArea(null);
    } else if (step === 3) {
      // Focus selection → depends on mode
      if (goal === 'area') {
        setStep(2); // Back to area selection
      } else {
        setStep(1); // Back to goal selection
        setGoal(null);
      }
    } else if (step === 4) {
      // Review → Focus selection
      setStep(3);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return goal !== null;
    }
    if (step === 2) {
      return area !== null;
    }
    if (step === 3) {
      return focusArea !== 'custom' || customFocus.trim() !== '';
    }
    return true;
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "What's your goal?";
      case 2:
        return 'Which area?';
      case 3:
        return 'Where should Mason look?';
      case 4:
        return 'Your command is ready';
      default:
        return '';
    }
  };

  const selectedGoal = GOALS.find((g) => g.id === goal);
  const selectedArea = AREAS.find((a) => a.id === area);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl mx-4 max-h-[85vh] bg-navy border border-gray-700 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded">
              <Sparkles className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Generate New Ideas
              </h2>
              <p className="text-sm text-gray-400">{getStepTitle()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress - only show after step 1 */}
        {step > 1 && (
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: displayTotalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i + 1 <= displayStep ? 'bg-gold' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Step {displayStep} of {displayTotalSteps}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {/* Step 1: Goal Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleGoalSelect(g.id)}
                      className={`w-full p-4 text-left border transition-all ${
                        g.highlight
                          ? 'border-gold/50 bg-gold/5 hover:border-gold hover:bg-gold/10'
                          : 'border-gray-700 bg-black/30 hover:border-gray-600 hover:bg-black/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-2.5 rounded ${
                            g.highlight ? 'bg-gold/20' : 'bg-gray-800'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              g.highlight ? 'text-gold' : 'text-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                g.highlight ? 'text-gold' : 'text-white'
                              }`}
                            >
                              {g.title}
                            </span>
                            {g.highlight && (
                              <span className="px-2 py-0.5 text-xs bg-gold/20 text-gold rounded">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {g.subtitle}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {g.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs">
                            <span className="text-gray-400">
                              Output:{' '}
                              <span className="text-white">{g.output}</span>
                            </span>
                            <span className="text-gray-400">
                              Time: <span className="text-white">{g.time}</span>
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {/* Step 2: Area Selection (only for area goal) */}
            {step === 2 && goal === 'area' && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-sm text-gray-400 mb-4">
                  Select a domain to focus your analysis. Each agent specializes
                  in finding specific types of improvements.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {AREAS.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleAreaSelect(a.id)}
                        className={`p-4 text-left border transition-all hover:scale-[1.02] ${a.border} ${a.bg} hover:bg-opacity-20`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${a.color}`} />
                          <div>
                            <span className="font-medium text-white">
                              {a.label}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {a.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Focus Area */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Selection summary */}
                <div className="p-3 bg-gray-900/50 border border-gray-800 rounded">
                  <p className="text-xs text-gray-500 mb-1">You selected:</p>
                  <div className="flex items-center gap-2">
                    {selectedGoal && (
                      <>
                        <selectedGoal.icon
                          className={`w-4 h-4 ${
                            selectedGoal.highlight
                              ? 'text-gold'
                              : 'text-gray-400'
                          }`}
                        />
                        <span className="text-white font-medium">
                          {selectedGoal.title}
                        </span>
                      </>
                    )}
                    {selectedArea && (
                      <>
                        <span className="text-gray-500">→</span>
                        <selectedArea.icon
                          className={`w-4 h-4 ${selectedArea.color}`}
                        />
                        <span className="text-white">{selectedArea.label}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Compact chip selection */}
                <div className="flex flex-wrap gap-2">
                  {FOCUS_OPTIONS.filter((o) => o.value !== 'custom').map(
                    (option) => (
                      <button
                        key={option.value}
                        onClick={() => setFocusArea(option.value)}
                        className={`px-3 py-1.5 text-sm border rounded transition-all ${
                          focusArea === option.value
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-gray-700 bg-black/30 text-gray-300 hover:border-gray-600 hover:text-white'
                        }`}
                      >
                        {focusArea === option.value && (
                          <Check className="w-3 h-3 inline mr-1.5" />
                        )}
                        {option.label}
                      </button>
                    ),
                  )}
                </div>

                {/* Custom input */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={customFocus}
                    onChange={(e) => {
                      setCustomFocus(e.target.value);
                      if (e.target.value) {
                        setFocusArea('custom');
                      }
                    }}
                    onFocus={() => {
                      if (customFocus) {
                        setFocusArea('custom');
                      }
                    }}
                    placeholder="Or type a custom path: src/features/billing/"
                    className={`w-full px-4 py-2.5 bg-black border text-white text-sm placeholder-gray-500 focus:outline-none transition-colors ${
                      focusArea === 'custom'
                        ? 'border-gold'
                        : 'border-gray-700 focus:border-gold'
                    }`}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 4: Review & Copy (final step) */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Command Preview - prominent */}
                <div className="p-4 bg-black border border-gray-700 rounded">
                  <pre className="text-gold font-mono text-sm whitespace-pre-wrap">
                    {generateCommand()}
                  </pre>
                  <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-400">
                    {selectedGoal?.title}
                    {selectedArea && ` → ${selectedArea.label}`}
                    {' • '}
                    {goal === 'area' ? '5 items' : selectedGoal?.output}
                    {getFocusText() && ` • Focus: ${getFocusText()}`}
                  </div>
                </div>

                {/* Simple instruction */}
                <p className="text-sm text-gray-400">
                  Run{' '}
                  <code className="px-1.5 py-0.5 bg-black text-gold rounded text-xs">
                    claude
                  </code>{' '}
                  in your terminal, paste this command, and press Enter.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            {step === 1 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                Back
              </>
            )}
          </button>

          {step === 4 ? (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold text-navy font-semibold hover:bg-gold/90 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Command
                </>
              )}
            </button>
          ) : step === 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2 bg-gold text-navy font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review Command
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
