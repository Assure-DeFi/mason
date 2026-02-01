'use client';

import { Github, Key, Database, ChevronRight } from 'lucide-react';

export function SettingsSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-white">Settings Overview</h4>
        <p className="text-gray-400">
          Configure Mason through the user menu in the top-right corner of the
          dashboard.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Github className="h-5 w-5 text-gold" />
          Repository Settings
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Connect new repositories from GitHub</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Install Mason CLI in connected repos</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Disconnect repositories you no longer need</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Key className="h-5 w-5 text-gold" />
          API Keys
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Generate new API keys for CLI authentication</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>View existing keys (prefixes only for security)</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Revoke keys that are no longer needed</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="flex items-center gap-2 font-semibold text-white">
          <Database className="h-5 w-5 text-gold" />
          Database Setup
        </h4>
        <div className="rounded-lg border border-gray-700 bg-black/30 p-4">
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Re-run the setup wizard if needed</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Update database credentials</span>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-gold" />
              <span>Run migrations for new features</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
