'use client';

import { useEffect, useCallback, useState } from 'react';

interface ShortcutConfig {
  /** Key to listen for */
  key: string;
  /** Modifier keys required */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  /** Handler function */
  handler: () => void;
  /** Description for help display */
  description: string;
  /** Whether this shortcut is enabled */
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are globally enabled */
  enabled?: boolean;
  /** Shortcuts configuration */
  shortcuts: ShortcutConfig[];
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {return;}

      // Don't handle shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for help shortcut (?)
      if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) {continue;}

        const modifiers = shortcut.modifiers || {};
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!event.ctrlKey === !!modifiers.ctrl;
        const altMatches = !!event.altKey === !!modifiers.alt;
        const shiftMatches = !!event.shiftKey === !!modifiers.shift;
        const metaMatches = !!event.metaKey === !!modifiers.meta;

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showHelp,
    setShowHelp,
  };
}

/**
 * Pre-configured backlog page shortcuts
 */
export function useBacklogShortcuts({
  onRefresh,
  onStatusChange,
  onNavigate,
  onSelectItem,
  selectedIndex,
  itemCount,
}: {
  onRefresh: () => void;
  onStatusChange: (status: string) => void;
  onNavigate: (direction: 'up' | 'down') => void;
  onSelectItem: () => void;
  selectedIndex: number;
  itemCount: number;
}) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'r',
      handler: onRefresh,
      description: 'Refresh items',
    },
    {
      key: '1',
      handler: () => onStatusChange('new'),
      description: 'Show New items',
    },
    {
      key: '2',
      handler: () => onStatusChange('approved'),
      description: 'Show Approved items',
    },
    {
      key: '3',
      handler: () => onStatusChange('in_progress'),
      description: 'Show In Progress items',
    },
    {
      key: '4',
      handler: () => onStatusChange('completed'),
      description: 'Show Completed items',
    },
    {
      key: '5',
      handler: () => onStatusChange('all'),
      description: 'Show All items',
    },
    {
      key: 'j',
      handler: () => onNavigate('down'),
      description: 'Navigate down',
      enabled: itemCount > 0,
    },
    {
      key: 'k',
      handler: () => onNavigate('up'),
      description: 'Navigate up',
      enabled: itemCount > 0,
    },
    {
      key: 'Enter',
      handler: onSelectItem,
      description: 'Open selected item',
      enabled: selectedIndex >= 0,
    },
  ];

  return useKeyboardShortcuts({ shortcuts });
}

/**
 * Keyboard shortcuts help modal component
 */
export function KeyboardShortcutsHelp({
  show,
  onClose,
  shortcuts,
}: {
  show: boolean;
  onClose: () => void;
  shortcuts: { key: string; description: string; modifiers?: string }[];
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-navy border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-gray-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gold font-mono">
                {shortcut.modifiers ? `${shortcut.modifiers}+` : ''}
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-500">Press ? to toggle this help</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded hover:bg-white/5"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

export default useKeyboardShortcuts;
