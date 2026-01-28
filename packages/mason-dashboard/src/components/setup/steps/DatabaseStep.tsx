'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Check,
  X,
  Loader2,
  Database,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WizardStepProps } from '../SetupWizard';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import {
  testUserConnection,
  checkTablesExist,
  saveMasonConfig,
} from '@/lib/supabase/user-client';

interface ConnectionState {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

interface MigrationState {
  status: 'idle' | 'checking' | 'needed' | 'running' | 'success' | 'error';
  message?: string;
  missingTables?: string[];
}

export function DatabaseStep({ onNext, onBack }: WizardStepProps) {
  const { config, saveConfig, refresh } = useUserDatabase();

  const [projectUrl, setProjectUrl] = useState(config?.supabaseUrl || '');
  const [anonKey, setAnonKey] = useState(config?.supabaseAnonKey || '');
  const [serviceKey, setServiceKey] = useState(
    config?.supabaseServiceKey || '',
  );
  const [showInstructions, setShowInstructions] = useState(true);

  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
  });
  const [migration, setMigration] = useState<MigrationState>({
    status: 'idle',
  });

  const handleTestConnection = async () => {
    if (!projectUrl || !anonKey) {
      setConnection({
        status: 'error',
        message: 'Please enter Project URL and Anon Key',
      });
      return;
    }

    setConnection({ status: 'testing' });
    setMigration({ status: 'idle' });

    const result = await testUserConnection(projectUrl, anonKey);

    if (result.success) {
      setConnection({ status: 'success', message: 'Connection successful' });
      saveMasonConfig({
        supabaseUrl: projectUrl,
        supabaseAnonKey: anonKey,
        supabaseServiceKey: serviceKey || undefined,
        setupComplete: false,
      });
      refresh();

      if (serviceKey) {
        setMigration({ status: 'checking' });
        const tableResult = await checkTablesExist(projectUrl, serviceKey);
        if (tableResult.exists) {
          setMigration({ status: 'success', message: 'All tables exist' });
        } else {
          setMigration({
            status: 'needed',
            message: 'Some tables are missing',
            missingTables: tableResult.missing,
          });
        }
      }
    } else {
      setConnection({
        status: 'error',
        message: result.error || 'Connection failed',
      });
    }
  };

  const handleRunMigrations = async () => {
    if (!serviceKey) {
      setMigration({
        status: 'error',
        message: 'Service Role Key is required for migrations',
      });
      return;
    }

    setMigration({ status: 'running', message: 'Running migrations...' });

    try {
      const response = await fetch('/api/setup/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: projectUrl,
          supabaseServiceKey: serviceKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }

      setMigration({ status: 'success', message: 'Migrations completed' });
    } catch (err) {
      setMigration({
        status: 'error',
        message: err instanceof Error ? err.message : 'Migration failed',
      });
    }
  };

  const isStepComplete =
    connection.status === 'success' &&
    (migration.status === 'success' || migration.status === 'idle');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Set Up Your Database</h2>
        <p className="mt-1 text-gray-400">
          Connect Mason to your own Supabase project for private data storage
        </p>
      </div>

      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-left"
      >
        <span className="font-medium text-white">Setup Instructions</span>
        {showInstructions ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {showInstructions && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="font-medium text-gold">1.</span>
              <span>
                Go to{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gold hover:underline"
                >
                  Supabase Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>{' '}
                and create a free project
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-gold">2.</span>
              <span>
                Go to <strong>Project Settings</strong> (gear icon) then{' '}
                <strong>API</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-gold">3.</span>
              <span>
                Copy your <strong>Project URL</strong> and{' '}
                <strong>anon public</strong> key
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-gold">4.</span>
              <span>
                For migrations, also copy the{' '}
                <strong>service_role secret</strong> key
              </span>
            </li>
          </ol>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="projectUrl"
            className="mb-2 block text-sm font-medium text-white"
          >
            Project URL
          </label>
          <input
            id="projectUrl"
            type="url"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            placeholder="https://xxx.supabase.co"
            className="w-full rounded-md border border-gray-700 bg-black px-4 py-2 text-white placeholder-gray-500 focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="anonKey"
            className="mb-2 block text-sm font-medium text-white"
          >
            Anon Key (public)
          </label>
          <input
            id="anonKey"
            type="password"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
            placeholder="eyJ..."
            className="w-full rounded-md border border-gray-700 bg-black px-4 py-2 text-white placeholder-gray-500 focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="serviceKey"
            className="mb-2 block text-sm font-medium text-white"
          >
            Service Role Key (secret, for migrations)
          </label>
          <input
            id="serviceKey"
            type="password"
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            placeholder="eyJ..."
            className="w-full rounded-md border border-gray-700 bg-black px-4 py-2 text-white placeholder-gray-500 focus:border-gold focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Used only for initial table setup. Can be cleared after setup.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleTestConnection}
          disabled={connection.status === 'testing' || !projectUrl || !anonKey}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connection.status === 'testing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              Test Connection
            </>
          )}
        </button>
      </div>

      {connection.status !== 'idle' && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 ${
            connection.status === 'success'
              ? 'bg-green-900/20 text-green-400'
              : connection.status === 'error'
                ? 'bg-red-900/20 text-red-400'
                : 'bg-gray-900/50 text-gray-400'
          }`}
        >
          {connection.status === 'success' && <Check className="h-5 w-5" />}
          {connection.status === 'error' && <X className="h-5 w-5" />}
          {connection.status === 'testing' && (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          <span>{connection.message}</span>
        </div>
      )}

      {connection.status === 'success' && migration.status !== 'idle' && (
        <div className="space-y-3">
          <div
            className={`flex items-center gap-2 rounded-lg p-3 ${
              migration.status === 'success'
                ? 'bg-green-900/20 text-green-400'
                : migration.status === 'error'
                  ? 'bg-red-900/20 text-red-400'
                  : migration.status === 'needed'
                    ? 'bg-yellow-900/20 text-yellow-400'
                    : 'bg-gray-900/50 text-gray-400'
            }`}
          >
            {migration.status === 'success' && <Check className="h-5 w-5" />}
            {migration.status === 'error' && <X className="h-5 w-5" />}
            {migration.status === 'needed' && (
              <AlertCircle className="h-5 w-5" />
            )}
            {(migration.status === 'checking' ||
              migration.status === 'running') && (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            <span>{migration.message}</span>
          </div>

          {migration.status === 'needed' && migration.missingTables && (
            <>
              <div className="rounded-lg bg-gray-900/50 p-3">
                <p className="mb-2 text-sm text-gray-400">Missing tables:</p>
                <div className="flex flex-wrap gap-2">
                  {migration.missingTables.map((table) => (
                    <span
                      key={table}
                      className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-300"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRunMigrations}
                className="w-full rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90"
              >
                Set Up Tables
              </button>
            </>
          )}

          {migration.status === 'running' && (
            <button
              disabled
              className="w-full rounded-md bg-gold px-4 py-2 font-medium text-navy opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Migrations...
              </span>
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-md border border-gray-700 px-6 py-2 text-gray-300 transition-colors hover:bg-gray-900"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!isStepComplete}
          className="flex-1 rounded-md bg-gold px-6 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default DatabaseStep;
