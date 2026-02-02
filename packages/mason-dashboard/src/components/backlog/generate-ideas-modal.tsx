'use client';

import { X, Copy, Check, Sparkles, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

type AnalysisMode =
  | 'full'
  | 'quick'
  | 'banger'
  | 'area:feature'
  | 'area:ui'
  | 'area:ux'
  | 'area:api'
  | 'area:data'
  | 'area:security'
  | 'area:performance'
  | 'area:code-quality';

type FocusArea =
  | 'none'
  | 'auth'
  | 'dashboard'
  | 'api'
  | 'database'
  | 'components'
  | 'custom';

interface GenerateIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AnalysisMode;
}

const MODE_OPTIONS: {
  value: AnalysisMode;
  label: string;
  description: string;
  items?: string;
  highlight?: boolean;
}[] = [
  {
    value: 'banger',
    label: 'BANGER ONLY',
    description: 'Deep dive for ONE game-changing idea',
    items: '1 banger',
    highlight: true,
  },
  {
    value: 'full',
    label: 'Full Analysis',
    description: 'All 8 agents run in parallel',
    items: '25 items',
  },
  {
    value: 'quick',
    label: 'Quick Wins',
    description: 'Fast scan, top priorities only',
    items: '9 items',
  },
  {
    value: 'area:feature',
    label: 'Feature',
    description: 'Net-new functionality opportunities',
    items: '5 items',
  },
  {
    value: 'area:ui',
    label: 'UI',
    description: 'Visual changes, components, styling',
    items: '5 items',
  },
  {
    value: 'area:ux',
    label: 'UX',
    description: 'User flows, friction reduction',
    items: '5 items',
  },
  {
    value: 'area:api',
    label: 'API',
    description: 'Endpoints, backend services',
    items: '5 items',
  },
  {
    value: 'area:data',
    label: 'Data',
    description: 'Database schema, queries, modeling',
    items: '5 items',
  },
  {
    value: 'area:security',
    label: 'Security',
    description: 'Vulnerabilities, auth, hardening',
    items: '5 items',
  },
  {
    value: 'area:performance',
    label: 'Performance',
    description: 'Speed, optimization, caching',
    items: '5 items',
  },
  {
    value: 'area:code-quality',
    label: 'Code Quality',
    description: 'Tech debt, refactors, cleanup',
    items: '5 items',
  },
];

const FOCUS_OPTIONS: {
  value: FocusArea;
  label: string;
  placeholder: string;
}[] = [
  { value: 'none', label: 'Entire codebase', placeholder: '' },
  {
    value: 'auth',
    label: 'Authentication flow',
    placeholder: 'login, signup, session management',
  },
  {
    value: 'dashboard',
    label: 'Dashboard components',
    placeholder: 'admin panels, data views',
  },
  { value: 'api', label: 'API endpoints', placeholder: 'routes, controllers' },
  {
    value: 'database',
    label: 'Database layer',
    placeholder: 'queries, migrations, models',
  },
  {
    value: 'components',
    label: 'UI components',
    placeholder: 'reusable UI elements',
  },
  {
    value: 'custom',
    label: 'Custom path...',
    placeholder: 'src/features/billing/',
  },
];

export function GenerateIdeasModal({
  isOpen,
  onClose,
  initialMode = 'full',
}: GenerateIdeasModalProps) {
  const [mode, setMode] = useState<AnalysisMode>(initialMode);
  const [focusArea, setFocusArea] = useState<FocusArea>('none');
  const [customFocus, setCustomFocus] = useState('');
  const [copied, setCopied] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showFocusDropdown, setShowFocusDropdown] = useState(false);

  // Reset mode when initialMode changes (e.g., opening with banger mode)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowModeDropdown(false);
      setShowFocusDropdown(false);
    };
    if (showModeDropdown || showFocusDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showModeDropdown, showFocusDropdown]);

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

  const generatePrompt = (): string => {
    let prompt = `/pm-review`;

    if (mode !== 'full') {
      prompt += ` ${mode}`;
    }

    // Add focus context if specified
    const focusText = getFocusText();
    if (focusText) {
      prompt += `\n\nFocus on: ${focusText}`;
    }

    return prompt;
  };

  const getFocusText = (): string => {
    if (focusArea === 'none') {
      return '';
    }
    if (focusArea === 'custom') {
      return customFocus;
    }

    const focusOption = FOCUS_OPTIONS.find((f) => f.value === focusArea);
    return focusOption?.label || '';
  };

  const handleCopy = async () => {
    const prompt = generatePrompt();
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedMode = MODE_OPTIONS.find((m) => m.value === mode);
  const selectedFocus = FOCUS_OPTIONS.find((f) => f.value === focusArea);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className="relative w-full max-w-lg mx-4 bg-navy border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
              <p className="text-sm text-gray-400">
                Configure and run a PM review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Analysis Mode
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModeDropdown(!showModeDropdown);
                  setShowFocusDropdown(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 bg-black text-left hover:border-gray-600 transition-colors ${
                  selectedMode?.highlight
                    ? 'border-2 border-gold/60'
                    : 'border border-gray-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${selectedMode?.highlight ? 'text-gold' : 'text-white'}`}
                    >
                      {selectedMode?.label}
                    </span>
                    {selectedMode?.highlight && (
                      <Sparkles className="w-4 h-4 text-gold" />
                    )}
                  </div>
                  <div
                    className={`text-sm ${selectedMode?.highlight ? 'text-gold/60' : 'text-gray-400'}`}
                  >
                    {selectedMode?.description}
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showModeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-black border border-gray-700 shadow-xl max-h-64 overflow-auto">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMode(option.value);
                        setShowModeDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                        mode === option.value
                          ? 'bg-gold/10 border-l-2 border-gold'
                          : option.highlight
                            ? 'bg-gold/5 border-l-2 border-gold/50'
                            : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${option.highlight ? 'text-gold' : 'text-white'}`}
                        >
                          {option.label}
                        </span>
                        {option.highlight && (
                          <Sparkles className="w-3 h-3 text-gold" />
                        )}
                        {option.items && (
                          <span
                            className={`text-xs ${option.highlight ? 'text-gold/70' : 'text-gray-500'}`}
                          >
                            ({option.items})
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-sm ${option.highlight ? 'text-gold/60' : 'text-gray-400'}`}
                      >
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Focus Area Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Focus Area <span className="text-gray-500">(optional)</span>
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFocusDropdown(!showFocusDropdown);
                  setShowModeDropdown(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-black border border-gray-700 text-left hover:border-gray-600 transition-colors"
              >
                <div className="text-white">{selectedFocus?.label}</div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${showFocusDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showFocusDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-black border border-gray-700 shadow-xl max-h-64 overflow-auto">
                  {FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusArea(option.value);
                        setShowFocusDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                        focusArea === option.value
                          ? 'bg-gold/10 border-l-2 border-gold'
                          : ''
                      }`}
                    >
                      <div className="text-white">{option.label}</div>
                      {option.placeholder && (
                        <div className="text-sm text-gray-500">
                          {option.placeholder}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom focus input */}
            {focusArea === 'custom' && (
              <input
                type="text"
                value={customFocus}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="e.g., src/features/billing/ or 'user onboarding flow'"
                className="w-full mt-2 px-4 py-3 bg-black border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              />
            )}
          </div>

          {/* Generated Command Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Command to Run
            </label>
            <div className="relative">
              <pre className="px-4 py-3 bg-black border border-gray-700 text-gold font-mono text-sm whitespace-pre-wrap break-all min-h-[52px]">
                {generatePrompt()}
              </pre>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-gray-900/50 border border-gray-800">
            <h4 className="text-sm font-medium text-white mb-2">How to run:</h4>
            <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
              <li>
                Click <strong className="text-white">Copy Command</strong> below
              </li>
              <li>Open your terminal in your project directory</li>
              <li>
                Run{' '}
                <code className="px-1.5 py-0.5 bg-black text-gold">claude</code>{' '}
                to start Claude Code
              </li>
              <li>Paste the command and press Enter</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2 bg-gold text-navy font-medium hover:bg-gold/90 transition-colors"
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
        </div>
      </div>
    </div>
  );
}
