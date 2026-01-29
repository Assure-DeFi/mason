'use client';

import { clsx } from 'clsx';
import { Check, ExternalLink, Github, Database } from 'lucide-react';
import { useState, useEffect } from 'react';

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
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'github',
    label: 'I have a GitHub account',
    description: 'Required for authentication and repository access',
    icon: <Github className="w-5 h-5" />,
  },
  {
    id: 'supabase',
    label: 'I have or will create a Supabase account',
    description: 'Free tier is sufficient - your data stays in your database',
    link: {
      url: 'https://supabase.com/dashboard',
      label: 'Create Supabase Account',
    },
    icon: <Database className="w-5 h-5" />,
  },
];

const SESSION_KEY = 'mason_pre_setup_complete';

export function PreSetupChecklist({ onReady }: PreSetupChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

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

  const allChecked = CHECKLIST_ITEMS.every((item) => checkedItems.has(item.id));

  if (!isVisible) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-lg mx-4 rounded-lg border border-gray-800 bg-navy p-6 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            Before You Begin
          </h2>
          <p className="text-gray-400 text-sm">
            Make sure you have the following ready to complete setup
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
                    ? 'border-gold/50 bg-gold/5'
                    : 'border-gray-700 bg-black/30 hover:border-gray-600',
                )}
                onClick={() => handleCheck(item.id)}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    className={clsx(
                      'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors',
                      isChecked
                        ? 'border-gold bg-gold text-navy'
                        : 'border-gray-600 bg-transparent',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheck(item.id);
                    }}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400">{item.icon}</span>
                      <span
                        className={clsx(
                          'font-medium',
                          isChecked ? 'text-white' : 'text-gray-200',
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{item.description}</p>
                    {item.link && (
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
              'w-full rounded-md px-6 py-3 font-medium transition-all',
              allChecked
                ? 'bg-gold text-navy hover:opacity-90'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed',
            )}
          >
            {allChecked
              ? "I'm Ready - Start Setup"
              : 'Check all items to continue'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Setup takes approximately 5 minutes
          </p>
        </div>
      </div>
    </div>
  );
}

export default PreSetupChecklist;
