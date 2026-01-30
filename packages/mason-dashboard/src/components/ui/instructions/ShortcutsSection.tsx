'use client';

import { ShortcutRow, CommandRow } from './shared';

export function ShortcutsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Keyboard Shortcuts</h4>
        <p className="text-gray-400">
          Use these keyboard shortcuts for faster navigation and actions.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Item Detail Modal</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ShortcutRow shortcut="G" description="Generate PRD" />
            <ShortcutRow shortcut="A" description="Approve item" />
            <ShortcutRow shortcut="X" description="Reject item" />
            <ShortcutRow shortcut="Esc" description="Close modal" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Global Shortcuts</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ShortcutRow shortcut="Esc" description="Close any modal" />
            <ShortcutRow shortcut="Enter" description="Confirm action" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-white">Claude Code Commands</h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <div className="space-y-2">
            <CommandRow
              command="/pm-review"
              description="Run codebase analysis"
            />
            <CommandRow
              command="/pm-review area:frontend-ux"
              description="Analyze frontend only"
            />
            <CommandRow
              command="/pm-review area:api-backend"
              description="Analyze backend only"
            />
            <CommandRow
              command="/pm-review quick"
              description="Quick wins only"
            />
            <CommandRow
              command="/execute-approved"
              description="Execute approved items"
            />
            <CommandRow command="/commit" description="Create a git commit" />
          </div>
        </div>
      </div>
    </div>
  );
}
