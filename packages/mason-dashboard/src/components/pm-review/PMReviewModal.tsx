'use client';

import { clsx } from 'clsx';
import {
  X,
  Sparkles,
  Settings,
  Zap,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

type DomainFocus =
  | 'feature'
  | 'ui'
  | 'ux'
  | 'api'
  | 'data'
  | 'security'
  | 'performance'
  | 'code-quality';

interface PMReviewConfig {
  areaOfFocus: string;
  domainFocus?: DomainFocus;
  mode: 'full' | 'quick';
}

interface AreaSuggestion {
  label: string;
  path: string;
  description: string;
}

interface PMReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyCommand: (command: string) => void;
  repositoryId?: string | null;
}

type ModalView = 'selection' | 'configure' | 'command';

const DOMAIN_OPTIONS: {
  value: DomainFocus;
  label: string;
  description: string;
  items: string;
}[] = [
  {
    value: 'feature',
    label: 'Feature',
    description: 'Net-new functionality opportunities',
    items: '5 items',
  },
  {
    value: 'ui',
    label: 'UI',
    description: 'Visual changes, components, styling',
    items: '5 items',
  },
  {
    value: 'ux',
    label: 'UX',
    description: 'User flows, friction reduction',
    items: '5 items',
  },
  {
    value: 'api',
    label: 'API',
    description: 'Endpoints, backend services',
    items: '5 items',
  },
  {
    value: 'data',
    label: 'Data',
    description: 'Database schema, queries, modeling',
    items: '5 items',
  },
  {
    value: 'security',
    label: 'Security',
    description: 'Vulnerabilities, auth, hardening',
    items: '5 items',
  },
  {
    value: 'performance',
    label: 'Performance',
    description: 'Speed, optimization, caching',
    items: '5 items',
  },
  {
    value: 'code-quality',
    label: 'Code Quality',
    description: 'Tech debt, refactors, cleanup',
    items: '5 items',
  },
];

function generateCommand(config: PMReviewConfig): string {
  const parts: string[] = ['/pm-review'];

  if (config.domainFocus) {
    parts[0] = `/pm-review area:${config.domainFocus}`;
  } else if (config.mode === 'quick') {
    parts[0] = '/pm-review quick';
  }

  if (config.areaOfFocus.trim()) {
    parts.push('');
    parts.push(`Focus on: ${config.areaOfFocus.trim()}`);
  }

  return parts.join('\n');
}

export function PMReviewModal({
  isOpen,
  onClose,
  onCopyCommand,
  repositoryId,
}: PMReviewModalProps) {
  const [view, setView] = useState<ModalView>('selection');
  const [config, setConfig] = useState<PMReviewConfig>({
    areaOfFocus: '',
    domainFocus: undefined,
    mode: 'full',
  });
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [hasCopied, setHasCopied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setView('selection');
      setConfig({
        areaOfFocus: '',
        domainFocus: undefined,
        mode: 'full',
      });
      setGeneratedCommand('');
      setHasCopied(false);
    }
  }, [isOpen]);

  // Fetch suggestions when repository changes
  useEffect(() => {
    if (repositoryId && isOpen) {
      void fetchSuggestions(repositoryId);
    }
  }, [repositoryId, isOpen]);

  const fetchSuggestions = async (repoId: string) => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/repo-structure/${repoId}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && view === 'configure') {
        handleGenerateCommand();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, view, onClose]);

  const handleTryMyLuck = () => {
    const command = '/pm-review';
    setGeneratedCommand(command);
    setView('command');
  };

  const handleGenerateCommand = () => {
    const command = generateCommand(config);
    setGeneratedCommand(command);
    setView('command');
  };

  const handleCopyCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCommand);
      setHasCopied(true);
      onCopyCommand(generatedCommand);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [generatedCommand, onCopyCommand]);

  const handleCopyAndClose = useCallback(async () => {
    await handleCopyCommand();
    setTimeout(() => onClose(), 500);
  }, [handleCopyCommand, onClose]);

  const handleSuggestionClick = (suggestion: AreaSuggestion) => {
    setConfig((prev) => ({
      ...prev,
      areaOfFocus: prev.areaOfFocus
        ? `${prev.areaOfFocus}, ${suggestion.label}`
        : suggestion.label,
    }));
  };

  const handleStartOver = () => {
    setView('selection');
    setConfig({
      areaOfFocus: '',
      domainFocus: undefined,
      mode: 'full',
    });
    setGeneratedCommand('');
    setHasCopied(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm backdrop-blur-fallback animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-center min-h-screen p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-black border border-gray-800 w-full max-w-lg overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              {view !== 'selection' && (
                <button
                  onClick={() =>
                    view === 'command'
                      ? handleStartOver()
                      : setView('selection')
                  }
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-lg font-semibold text-white">
                {view === 'selection' && 'Generate Improvement Ideas'}
                {view === 'configure' && 'Configure Analysis'}
                {view === 'command' && 'Command Ready'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {view === 'selection' && (
              <SelectionView
                onTryMyLuck={handleTryMyLuck}
                onConfigure={() => setView('configure')}
              />
            )}

            {view === 'configure' && (
              <ConfigureView
                config={config}
                onConfigChange={setConfig}
                suggestions={suggestions}
                isLoadingSuggestions={isLoadingSuggestions}
                onSuggestionClick={handleSuggestionClick}
                onGenerate={handleGenerateCommand}
              />
            )}

            {view === 'command' && (
              <CommandView
                command={generatedCommand}
                hasCopied={hasCopied}
                onCopy={handleCopyCommand}
                onStartOver={handleStartOver}
                onCopyAndClose={handleCopyAndClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectionView({
  onTryMyLuck,
  onConfigure,
}: {
  onTryMyLuck: () => void;
  onConfigure: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Try My Luck Card */}
      <button
        onClick={onTryMyLuck}
        className="w-full p-5 border border-gray-700 bg-black/50 hover:border-gold/50 hover:bg-gold/5 transition-all text-left group"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gold/10 text-gold">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-lg font-semibold text-white group-hover:text-gold transition-colors">
            Try My Luck
          </span>
        </div>
        <p className="text-sm text-gray-400 pl-12">
          Full system review across all domains. Best for comprehensive
          analysis.
        </p>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-sm text-gray-500 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      {/* Configure Card */}
      <button
        onClick={onConfigure}
        className="w-full p-5 border border-gray-700 bg-black/50 hover:border-gray-600 hover:bg-white/5 transition-all text-left group"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-800 text-gray-400 group-hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-lg font-semibold text-white">
            Configure Analysis
          </span>
        </div>
        <p className="text-sm text-gray-400 pl-12">
          Focus on specific areas or domains for targeted insights.
        </p>
      </button>
    </div>
  );
}

function ConfigureView({
  config,
  onConfigChange,
  suggestions,
  isLoadingSuggestions,
  onSuggestionClick,
  onGenerate,
}: {
  config: PMReviewConfig;
  onConfigChange: (config: PMReviewConfig) => void;
  suggestions: AreaSuggestion[];
  isLoadingSuggestions: boolean;
  onSuggestionClick: (suggestion: AreaSuggestion) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Area of Focus */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Area of Focus
        </label>
        <textarea
          value={config.areaOfFocus}
          onChange={(e) =>
            onConfigChange({ ...config, areaOfFocus: e.target.value })
          }
          placeholder="What part of the app to analyze..."
          className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all resize-none"
          rows={2}
        />

        {/* Suggestions */}
        {(suggestions.length > 0 || isLoadingSuggestions) && (
          <div className="mt-3">
            <span className="text-xs text-gray-500 mb-2 block">
              Suggestions (click to add):
            </span>
            <div className="flex flex-wrap gap-2">
              {isLoadingSuggestions ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading suggestions...
                </div>
              ) : (
                suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    title={suggestion.description}
                  >
                    {suggestion.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Domain Focus */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Domain Focus (optional)
        </label>
        <select
          value={config.domainFocus || ''}
          onChange={(e) =>
            onConfigChange({
              ...config,
              domainFocus: (e.target.value || undefined) as
                | DomainFocus
                | undefined,
            })
          }
          className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
        >
          <option value="">All domains (25 items)</option>
          {DOMAIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description} ({option.items})
            </option>
          ))}
        </select>
      </div>

      {/* Mode */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onConfigChange({ ...config, mode: 'full' })}
            className={clsx(
              'p-4 border text-left transition-all',
              config.mode === 'full'
                ? 'border-gold bg-gold/10 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-600',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={clsx(
                  'w-4 h-4 border-2 flex items-center justify-center',
                  config.mode === 'full'
                    ? 'border-gold bg-gold'
                    : 'border-gray-600',
                )}
              >
                {config.mode === 'full' && <div className="w-2 h-2 bg-navy" />}
              </div>
              <span className="font-medium">Full</span>
            </div>
            <p className="text-xs text-gray-500 pl-6">
              25 items (3/agent + banger)
            </p>
          </button>

          <button
            onClick={() => onConfigChange({ ...config, mode: 'quick' })}
            className={clsx(
              'p-4 border text-left transition-all',
              config.mode === 'quick'
                ? 'border-gold bg-gold/10 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-600',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={clsx(
                  'w-4 h-4 border-2 flex items-center justify-center',
                  config.mode === 'quick'
                    ? 'border-gold bg-gold'
                    : 'border-gray-600',
                )}
              >
                {config.mode === 'quick' && <div className="w-2 h-2 bg-navy" />}
              </div>
              <span className="font-medium">Quick Wins</span>
            </div>
            <p className="text-xs text-gray-500 pl-6">
              9 items (1/agent + banger)
            </p>
          </button>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#E2D243] text-[#0A0724] font-semibold hover:opacity-90 transition-opacity"
      >
        <Sparkles className="w-4 h-4" />
        Generate Command
      </button>
    </div>
  );
}

function CommandView({
  command,
  hasCopied,
  onCopy,
  onStartOver,
  onCopyAndClose,
}: {
  command: string;
  hasCopied: boolean;
  onCopy: () => void;
  onStartOver: () => void;
  onCopyAndClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">Copy and paste into Claude Code:</p>

      {/* Command Display */}
      <div className="relative">
        <pre className="p-4 bg-gray-900 border border-gray-800 text-sm text-white font-mono whitespace-pre-wrap overflow-x-auto">
          {command}
        </pre>
        <button
          onClick={onCopy}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          title="Copy to clipboard"
        >
          {hasCopied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Results will appear in this dashboard automatically once the analysis
        completes.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onStartOver}
          className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 hover:bg-white/5 transition-all font-medium"
        >
          Start Over
        </button>
        <button
          onClick={onCopyAndClose}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E2D243] text-[#0A0724] font-semibold hover:opacity-90 transition-opacity"
        >
          {hasCopied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy & Close
            </>
          )}
        </button>
      </div>
    </div>
  );
}
