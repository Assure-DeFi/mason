'use client';

import { Command, Keyboard } from 'lucide-react';
import { useState } from 'react';

interface ShortcutDef {
  keys: string[];
  label: string;
  enabled: boolean;
}

interface KeyboardShortcutBarProps {
  selectedCount: number;
  hasItems: boolean;
}

export function KeyboardShortcutBar({
  selectedCount,
  hasItems,
}: KeyboardShortcutBarProps) {
  const [dismissed, setDismissed] = useState(false);
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  if (dismissed) {
    return null;
  }

  const shortcuts: ShortcutDef[] = [
    {
      keys: [mod, 'K'],
      label: 'Command palette',
      enabled: true,
    },
    {
      keys: [mod, 'A'],
      label: 'Select all',
      enabled: hasItems,
    },
    {
      keys: [mod, '⇧', 'A'],
      label: 'Approve',
      enabled: selectedCount > 0,
    },
    {
      keys: [mod, '⇧', 'X'],
      label: 'Reject',
      enabled: selectedCount > 0,
    },
    {
      keys: ['Esc'],
      label: 'Clear',
      enabled: selectedCount > 0,
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-900/95 border border-gray-700/60 backdrop-blur-sm shadow-2xl text-xs">
        <Keyboard className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.label}
            className={`flex items-center gap-1.5 ${shortcut.enabled ? 'text-gray-300' : 'text-gray-600'}`}
          >
            <span className="flex items-center gap-0.5">
              {shortcut.keys.map((key) => (
                <kbd
                  key={key}
                  className={`px-1.5 py-0.5 text-[10px] font-mono border ${
                    shortcut.enabled
                      ? 'bg-gray-800 border-gray-600 text-gray-300'
                      : 'bg-gray-900 border-gray-700 text-gray-600'
                  }`}
                >
                  {key === '⌘' ? (
                    <Command className="w-2.5 h-2.5 inline" />
                  ) : (
                    key
                  )}
                </kbd>
              ))}
            </span>
            <span>{shortcut.label}</span>
          </div>
        ))}
        <button
          onClick={() => setDismissed(true)}
          className="ml-1 text-gray-600 hover:text-gray-400 transition-colors"
          aria-label="Dismiss shortcut hints"
        >
          ×
        </button>
      </div>
    </div>
  );
}
