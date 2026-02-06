'use client';

import {
  Check,
  CheckCircle2,
  Command,
  Filter,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

interface CommandAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string[];
  enabled: boolean;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onApproveSelected: () => void;
  onRejectSelected: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onFilterByStatus: (status: string) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  selectedCount,
  onApproveSelected,
  onRejectSelected,
  onDeleteSelected,
  onSelectAll,
  onClearSelection,
  onFilterByStatus,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const actions: CommandAction[] = useMemo(
    () => [
      {
        id: 'approve',
        label: 'Approve selected',
        description: `Approve ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}`,
        icon: <Check className="w-4 h-4 text-green-400" />,
        shortcut: [mod, '⇧', 'A'],
        enabled: selectedCount > 0,
        onSelect: () => {
          onApproveSelected();
          onClose();
        },
      },
      {
        id: 'reject',
        label: 'Reject selected',
        description: `Reject ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}`,
        icon: <XCircle className="w-4 h-4 text-red-400" />,
        shortcut: [mod, '⇧', 'X'],
        enabled: selectedCount > 0,
        onSelect: () => {
          onRejectSelected();
          onClose();
        },
      },
      {
        id: 'delete',
        label: 'Delete selected',
        description: `Permanently delete ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`,
        icon: <Trash2 className="w-4 h-4 text-red-400" />,
        enabled: selectedCount > 0,
        onSelect: () => {
          onDeleteSelected();
          onClose();
        },
      },
      {
        id: 'select-all',
        label: 'Select all',
        description: 'Select all items in current view',
        icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
        shortcut: [mod, 'A'],
        enabled: true,
        onSelect: () => {
          onSelectAll();
          onClose();
        },
      },
      {
        id: 'clear-selection',
        label: 'Clear selection',
        description: 'Deselect all items',
        icon: <X className="w-4 h-4 text-gray-400" />,
        shortcut: ['Esc'],
        enabled: selectedCount > 0,
        onSelect: () => {
          onClearSelection();
          onClose();
        },
      },
      {
        id: 'filter-new',
        label: 'Show new items',
        description: 'Filter to show only new items',
        icon: <Filter className="w-4 h-4 text-yellow-400" />,
        enabled: true,
        onSelect: () => {
          onFilterByStatus('new');
          onClose();
        },
      },
      {
        id: 'filter-approved',
        label: 'Show approved items',
        description: 'Filter to show only approved items',
        icon: <Filter className="w-4 h-4 text-green-400" />,
        enabled: true,
        onSelect: () => {
          onFilterByStatus('approved');
          onClose();
        },
      },
      {
        id: 'filter-all',
        label: 'Show all items',
        description: 'Remove status filter',
        icon: <Filter className="w-4 h-4 text-gray-400" />,
        enabled: true,
        onSelect: () => {
          onFilterByStatus('all');
          onClose();
        },
      },
    ],
    [
      selectedCount,
      mod,
      onApproveSelected,
      onRejectSelected,
      onDeleteSelected,
      onSelectAll,
      onClearSelection,
      onFilterByStatus,
      onClose,
    ],
  );

  const filteredActions = useMemo(() => {
    if (!query) {
      return actions.filter((a) => a.enabled);
    }
    const q = query.toLowerCase();
    return actions.filter(
      (a) =>
        a.enabled &&
        (a.label.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)),
    );
  }, [actions, query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filteredActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const action = filteredActions[activeIndex];
        if (action) {
          action.onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filteredActions, activeIndex, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-600 text-gray-400">
            Esc
          </kbd>
        </div>

        <div className="max-h-[300px] overflow-y-auto py-1">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              No matching commands
            </div>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                onClick={action.onSelect}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === activeIndex
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {action.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {action.description}
                  </div>
                </div>
                {action.shortcut && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {action.shortcut.map((key) => (
                      <kbd
                        key={key}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-700 text-gray-500"
                      >
                        {key === '⌘' ? (
                          <Command className="w-2.5 h-2.5 inline" />
                        ) : (
                          key
                        )}
                      </kbd>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
