'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  Check,
  X,
  Loader2,
  Database,
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
import { HelpTooltip } from '@/components/ui/HelpTooltip';

interface ConnectionState {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

interface MigrationState {
  status: 'idle' | 'checking' | 'needed' | 'running' | 'success' | 'error';
  message?: string;
  missingTables?: string[];
}

interface ValidationState {
  isValid: boolean;
  message?: string;
}

// Validation functions
function validateSupabaseUrl(url: string): ValidationState {
  if (!url) return { isValid: false };

  // Check for basic URL format
  const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/;
  if (!urlPattern.test(url)) {
    return {
      isValid: false,
      message: 'Should be https://your-project.supabase.co',
    };
  }

  return { isValid: true };
}

function validateJwtKey(key: string): ValidationState {
  if (!key) return { isValid: false };

  // JWT keys start with eyJ
  if (!key.startsWith('eyJ')) {
    return {
      isValid: false,
      message: 'Should start with "eyJ" (JWT format)',
    };
  }

  // Basic JWT structure check (header.payload.signature)
  const parts = key.split('.');
  if (parts.length !== 3) {
    return {
      isValid: false,
      message: 'Invalid JWT format (should have 3 parts)',
    };
  }

  // Try to decode base64 to verify it's valid
  try {
    atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      message: 'Invalid base64 encoding',
    };
  }
}

export function DatabaseStep({ onNext, onBack }: WizardStepProps) {
  const { config, refresh } = useUserDatabase();

  const [projectUrl, setProjectUrl] = useState(config?.supabaseUrl || '');
  const [anonKey, setAnonKey] = useState(config?.supabaseAnonKey || '');
  const [serviceKey, setServiceKey] = useState(
    config?.supabaseServiceKey || '',
  );
  const [databasePassword, setDatabasePassword] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);

  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
  });
  const [migration, setMigration] = useState<MigrationState>({
    status: 'idle',
  });

  // Real-time validation with debounce
  const [urlValidation, setUrlValidation] = useState<ValidationState>({
    isValid: false,
  });
  const [anonKeyValidation, setAnonKeyValidation] = useState<ValidationState>({
    isValid: false,
  });
  const [serviceKeyValidation, setServiceKeyValidation] =
    useState<ValidationState>({ isValid: false });

  // Debounced URL validation
  useEffect(() => {
    const timer = setTimeout(() => {
      setUrlValidation(validateSupabaseUrl(projectUrl));
    }, 300);
    return () => clearTimeout(timer);
  }, [projectUrl]);

  // Debounced anon key validation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnonKeyValidation(validateJwtKey(anonKey));
    }, 300);
    return () => clearTimeout(timer);
  }, [anonKey]);

  // Debounced service key validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (serviceKey) {
        setServiceKeyValidation(validateJwtKey(serviceKey));
      } else {
        setServiceKeyValidation({ isValid: false });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [serviceKey]);

  const canTestConnection = useMemo(() => {
    return urlValidation.isValid && anonKeyValidation.isValid;
  }, [urlValidation.isValid, anonKeyValidation.isValid]);

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
          setMigration({ status: 'success', message: 'Database ready' });
        } else {
          // For new users, missing tables is expected - auto-run migrations if we have the password
          if (databasePassword) {
            // Auto-run migrations
            handleRunMigrations();
          } else {
            setMigration({
              status: 'needed',
              message: 'Ready to set up your database',
              missingTables: tableResult.missing,
            });
          }
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
    if (!databasePassword) {
      setMigration({
        status: 'error',
        message: 'Database Password is required for migrations',
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
          databasePassword: databasePassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }

      // Privacy: Credentials stay in localStorage only, never sent to central server
      // CLI reads from mason.config.json (which user exports from browser)
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

  // Render validation indicator
  const ValidationIndicator = ({
    validation,
    value,
  }: {
    validation: ValidationState;
    value: string;
  }) => {
    if (!value) return null;

    return (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {validation.isValid ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        )}
      </div>
    );
  };

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
            <li className="flex gap-2">
              <span className="font-medium text-gold">5.</span>
              <span>
                Go to <strong>Settings</strong> {'>'} <strong>Database</strong>{' '}
                and copy your <strong>database password</strong>
              </span>
            </li>
          </ol>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <label
              htmlFor="projectUrl"
              className="block text-sm font-medium text-white"
            >
              Project URL
            </label>
            <HelpTooltip
              title="Project URL"
              content="Found in Supabase Dashboard > Project Settings > API > Project URL. Looks like https://xxx.supabase.co"
              position="right"
            />
          </div>
          <div className="relative">
            <input
              id="projectUrl"
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              className={`w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                projectUrl
                  ? urlValidation.isValid
                    ? 'border-green-600 focus:border-green-500'
                    : 'border-red-600 focus:border-red-500'
                  : 'border-gray-700 focus:border-gold'
              }`}
            />
            <ValidationIndicator
              validation={urlValidation}
              value={projectUrl}
            />
          </div>
          {projectUrl && !urlValidation.isValid && urlValidation.message && (
            <p className="mt-1 text-xs text-red-400">{urlValidation.message}</p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <label
              htmlFor="anonKey"
              className="block text-sm font-medium text-white"
            >
              Anon Key (public)
            </label>
            <HelpTooltip
              title="Anon Key"
              content="The public anonymous key from Supabase. Found in Project Settings > API > anon public. Safe to expose in client-side code."
              position="right"
            />
          </div>
          <div className="relative">
            <input
              id="anonKey"
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJ..."
              className={`w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                anonKey
                  ? anonKeyValidation.isValid
                    ? 'border-green-600 focus:border-green-500'
                    : 'border-red-600 focus:border-red-500'
                  : 'border-gray-700 focus:border-gold'
              }`}
            />
            <ValidationIndicator
              validation={anonKeyValidation}
              value={anonKey}
            />
          </div>
          {anonKey &&
            !anonKeyValidation.isValid &&
            anonKeyValidation.message && (
              <p className="mt-1 text-xs text-red-400">
                {anonKeyValidation.message}
              </p>
            )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <label
              htmlFor="serviceKey"
              className="block text-sm font-medium text-white"
            >
              Service Role Key (secret, for migrations)
            </label>
            <HelpTooltip
              title="Service Role Key"
              content="The secret service key from Supabase. Found in Project Settings > API > service_role secret. Required only for initial table setup. Keep this secret!"
              position="right"
            />
          </div>
          <div className="relative">
            <input
              id="serviceKey"
              type="password"
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              placeholder="eyJ..."
              className={`w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                serviceKey
                  ? serviceKeyValidation.isValid
                    ? 'border-green-600 focus:border-green-500'
                    : 'border-red-600 focus:border-red-500'
                  : 'border-gray-700 focus:border-gold'
              }`}
            />
            <ValidationIndicator
              validation={serviceKeyValidation}
              value={serviceKey}
            />
          </div>
          {serviceKey &&
            !serviceKeyValidation.isValid &&
            serviceKeyValidation.message && (
              <p className="mt-1 text-xs text-red-400">
                {serviceKeyValidation.message}
              </p>
            )}
          <p className="mt-1 text-xs text-gray-500">
            Used only for initial table setup. Can be cleared after setup.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <label
              htmlFor="databasePassword"
              className="block text-sm font-medium text-white"
            >
              Database Password (for migrations)
            </label>
            <HelpTooltip
              title="Database Password"
              content="Found in Supabase Dashboard > Settings > Database > Database password. Required to run migrations directly against PostgreSQL."
              position="right"
            />
          </div>
          <div className="relative">
            <input
              id="databasePassword"
              type="password"
              value={databasePassword}
              onChange={(e) => setDatabasePassword(e.target.value)}
              placeholder="Your database password"
              className={`w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
                databasePassword
                  ? 'border-green-600 focus:border-green-500'
                  : 'border-gray-700 focus:border-gold'
              }`}
            />
            {databasePassword && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Check className="h-4 w-4 text-green-500" />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Required for automatic table setup. Found in Settings {'>'}{' '}
            Database.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleTestConnection}
          disabled={connection.status === 'testing' || !canTestConnection}
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
                    ? 'bg-gray-900/50 text-gray-300'
                    : 'bg-gray-900/50 text-gray-400'
            }`}
          >
            {migration.status === 'success' && <Check className="h-5 w-5" />}
            {migration.status === 'error' && <X className="h-5 w-5" />}
            {migration.status === 'needed' && <Database className="h-5 w-5" />}
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

              {!databasePassword && (
                <p className="text-sm text-gray-400">
                  Enter your Database Password above to continue.
                </p>
              )}

              <button
                onClick={handleRunMigrations}
                disabled={!databasePassword}
                className="w-full rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
