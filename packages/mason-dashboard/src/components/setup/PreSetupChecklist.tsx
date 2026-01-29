'use client';

import { clsx } from 'clsx';
import {
  Check,
  ExternalLink,
  Github,
  Database,
  Terminal,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { ClaudeCodeExplainer } from '@/components/ui/ClaudeCodeExplainer';

interface PreSetupChecklistProps {
  onReady: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  link?: {
    url: string;
    label: string;
  };
  icon: React.ReactNode;
  helpButton?: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'claude-code',
    label: 'Claude Code installed',
    description: "Anthropic's CLI for AI-powered coding",
    link: {
      url: 'https://www.anthropic.com/claude-code',
      label: 'Get Claude Code',
    },
    icon: <Terminal className="w-5 h-5" />,
    helpButton: true,
  },
  {
    id: 'github',
    label: 'A GitHub account',
    description: 'Required for authentication and repository access',
    icon: <Github className="w-5 h-5" />,
    link: {
      url: 'https://github.com/signup',
      label: 'Sign up free',
    },
  },
  {
    id: 'supabase',
    label: 'A free Supabase account',
    description: 'Your private database - all Mason data stays here',
    link: {
      url: 'https://supabase.com/dashboard/sign-up',
      label: 'Create one free',
    },
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'time',
    label: '5 minutes of time',
    description: "That's all it takes to get set up",
    icon: <Clock className="w-5 h-5" />,
  },
];

const SESSION_KEY = 'mason_pre_setup_complete';

export function PreSetupChecklist({ onReady }: PreSetupChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);
  const [showClaudeCodeExplainer, setShowClaudeCodeExplainer] = useState(false);

  // Check if user already completed the checklist
  useEffect(() => {
    const completed = sessionStorage.getItem(SESSION_KEY);
    if (completed === 'true') {
      setIsVisible(false);
      onReady();
    }
  }, [onReady]);

  const handleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReady = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setIsVisible(false);
    onReady();
  };

  const handleSkip = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setIsVisible(false);
    onReady();
  };

  const allChecked = CHECKLIST_ITEMS.every((item) => checkedItems.has(item.id));

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="w-full max-w-lg mx-4 rounded-lg border border-gray-800 bg-navy p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">
              What You&apos;ll Need
            </h2>
            <p className="text-gray-400 text-sm">
              Before we start, make sure you have these ready
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {CHECKLIST_ITEMS.map((item) => {
              const isChecked = checkedItems.has(item.id);

              return (
                <div
                  key={item.id}
                  className={clsx(
                    'rounded-lg border p-4 transition-all cursor-pointer',
                    isChecked
                      ? 'border-green-600/50 bg-green-900/10'
                      : 'border-gray-700 bg-black/30 hover:border-gray-600',
                  )}
                  onClick={() => handleCheck(item.id)}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCheck(item.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      className={clsx(
                        'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors',
                        isChecked
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-600 bg-transparent',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheck(item.id);
                      }}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                    </button>

                    <div
                      className={clsx(
                        'flex-shrink-0 p-2 rounded-lg',
                        isChecked
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-800 text-gray-400',
                      )}
                    >
                      {item.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={clsx(
                            'font-medium',
                            isChecked ? 'text-green-300' : 'text-white',
                          )}
                        >
                          {item.label}
                        </span>
                        {item.helpButton && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowClaudeCodeExplainer(true);
                            }}
                            className="p-0.5 text-gray-500 hover:text-gold transition-colors"
                            aria-label="What is this?"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {item.description}
                      </p>
                      {item.link && !isChecked && (
                        <a
                          href={item.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-gold hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.link.label}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleReady}
              disabled={!allChecked}
              className={clsx(
                'w-full rounded-md px-6 py-3 font-semibold transition-all',
                allChecked
                  ? 'bg-gold text-navy hover:opacity-90'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed',
              )}
            >
              {allChecked
                ? "I have these, let's go"
                : 'Check all items to continue'}
            </button>

            <button
              onClick={handleSkip}
              className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip - I know what I&apos;m doing
            </button>
          </div>
        </div>
      </div>

      {/* Claude Code Explainer Modal */}
      <ClaudeCodeExplainer
        isOpen={showClaudeCodeExplainer}
        onClose={() => setShowClaudeCodeExplainer(false)}
      />
    </>
  );
}

export default PreSetupChecklist;
