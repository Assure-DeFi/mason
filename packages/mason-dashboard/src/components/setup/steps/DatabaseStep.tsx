'use client';

import {
  ExternalLink,
  Check,
  X,
  Loader2,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { useUserDatabase } from '@/hooks/useUserDatabase';
import {
  testUserConnection,
  checkTablesExist,
  saveMasonConfig,
} from '@/lib/supabase/user-client';

import type { WizardStepProps } from '../SetupWizard';

interface ConnectionState {
  status: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

interface MigrationState {
  status: 'idle' | 'checking' | 'needed' | 'running' | 'success' | 'error';
  message?: string;
  missingTables?: string[];
  errorType?: 'connection' | 'auth' | 'unknown';
}

interface ValidationState {
  isValid: boolean;
  message?: string;
  guidance?: string;
  example?: string;
  type?: 'format' | 'network' | 'auth' | 'missing';
}

// Helper function to detect common URL mistakes
function detectUrlMistakes(url: string): ValidationState | null {
  // Check for http instead of https
  if (url.startsWith('http://')) {
    return {
      isValid: false,
      message: 'URL must use HTTPS, not HTTP',
      guidance: 'Replace "http://" with "https://" in your URL',
      example: 'https://abcdefgh.supabase.co',
      type: 'format',
    };
  }

  // Check for missing protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return {
      isValid: false,
      message: 'URL must start with https://',
      guidance: 'Add "https://" at the beginning of your URL',
      example: 'https://abcdefgh.supabase.co',
      type: 'format',
    };
  }

  // Check for wrong domain
  if (url.startsWith('https://') && !url.includes('.supabase.co')) {
    return {
      isValid: false,
      message: 'URL must be a Supabase domain',
      guidance:
        'Your Supabase Project URL ends with ".supabase.co". Find it in Supabase Dashboard > Project Settings > API > Project URL',
      example: 'https://abcdefgh.supabase.co',
      type: 'format',
    };
  }

  // Check for trailing slash
  if (url.endsWith('/') && url.length > 'https://'.length) {
    return {
      isValid: false,
      message: 'URL should not have a trailing slash',
      guidance: 'Remove the "/" at the end of your URL',
      example: 'https://abcdefgh.supabase.co',
      type: 'format',
    };
  }

  return null;
}

// Helper function to detect JWT key type
function detectKeyType(key: string): 'anon' | 'service' | 'unknown' {
  try {
    const parts = key.split('.');
    if (parts.length !== 3) {
      return 'unknown';
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    const role = payload.role;

    if (role === 'anon' || role === 'authenticated') {
      return 'anon';
    }
    if (role === 'service_role') {
      return 'service';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

// Validation functions
function validateSupabaseUrl(url: string): ValidationState {
  if (!url) {
    return { isValid: false };
  }

  // Check for common mistakes first
  const mistake = detectUrlMistakes(url);
  if (mistake) {
    return mistake;
  }

  // Check for basic URL format
  const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/;
  if (!urlPattern.test(url)) {
    return {
      isValid: false,
      message: 'Invalid Supabase URL format',
      guidance:
        'Your URL should look like: https://your-project-id.supabase.co (no trailing slash, must be HTTPS)',
      example: 'https://abcdefgh.supabase.co',
      type: 'format',
    };
  }

  return { isValid: true };
}

function validateJwtKey(
  key: string,
  expectedType?: 'anon' | 'service',
): ValidationState {
  if (!key) {
    return { isValid: false };
  }

  // JWT keys start with eyJ
  if (!key.startsWith('eyJ')) {
    return {
      isValid: false,
      message: 'Invalid key format - JWT keys start with "eyJ"',
      guidance:
        'Make sure you copied the complete key from Supabase Dashboard. The key should be a long string starting with "eyJ".',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      type: 'format',
    };
  }

  // Basic JWT structure check (header.payload.signature)
  const parts = key.split('.');
  if (parts.length !== 3) {
    return {
      isValid: false,
      message: 'Invalid JWT structure - should have 3 parts separated by dots',
      guidance:
        'The key appears to be incomplete or corrupted. Copy the entire key from Supabase Dashboard again.',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...',
      type: 'format',
    };
  }

  // Try to decode base64 to verify it's valid
  try {
    atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));

    // Detect if user is using the wrong key type
    if (expectedType) {
      const actualType = detectKeyType(key);

      if (
        expectedType === 'anon' &&
        actualType === 'service' &&
        key.length > 50
      ) {
        return {
          isValid: false,
          message: 'Wrong key type - this is a Service Role key',
          guidance:
            'You pasted the Service Role key, but this field needs the Anon (public) key. In Supabase Dashboard > API, look for "anon public" key, not "service_role secret".',
          example: 'The anon key is usually shorter and labeled "anon public"',
          type: 'format',
        };
      }

      if (
        expectedType === 'service' &&
        actualType === 'anon' &&
        key.length < 200
      ) {
        return {
          isValid: false,
          message: 'Wrong key type - this is an Anon key',
          guidance:
            'You pasted the Anon key, but this field needs the Service Role key. In Supabase Dashboard > API, look for "service_role secret", not "anon public".',
          example:
            'The service role key is usually longer and labeled "service_role secret"',
          type: 'format',
        };
      }
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      message: 'Invalid base64 encoding',
      guidance:
        'The key appears to be corrupted. Try copying it again from Supabase Dashboard.',
      type: 'format',
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
  const [showExamples, setShowExamples] = useState(false);

  const [connection, setConnection] = useState<ConnectionState>({
    status: 'idle',
  });
  const [migration, setMigration] = useState<MigrationState>({
    status: 'idle',
  });
  const [connectionString, setConnectionString] = useState('');
  const [showConnectionFallback, setShowConnectionFallback] = useState(false);

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
      setAnonKeyValidation(validateJwtKey(anonKey, 'anon'));
    }, 300);
    return () => clearTimeout(timer);
  }, [anonKey]);

  // Debounced service key validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (serviceKey) {
        setServiceKeyValidation(validateJwtKey(serviceKey, 'service'));
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
            void handleRunMigrations(false);
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
      // Provide enhanced error messaging based on error type
      let errorMessage = result.error || 'Connection failed';
      if (
        errorMessage.includes('Invalid API key') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('401')
      ) {
        errorMessage =
          'Authentication failed - Check that your Anon Key is correct and matches your Project URL';
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch')
      ) {
        errorMessage =
          'Network error - Check your internet connection and that your Project URL is correct';
      } else if (
        errorMessage.includes('CORS') ||
        errorMessage.includes('cors')
      ) {
        errorMessage =
          'CORS error - Your Supabase project may have restricted API access. Check your project settings.';
      }

      setConnection({
        status: 'error',
        message: errorMessage,
      });
    }
  };

  const handleRunMigrations = async (useConnectionString = false) => {
    // If using connection string fallback, require connection string
    if (useConnectionString && !connectionString) {
      setMigration({
        status: 'error',
        message: 'Please enter a connection string',
      });
      return;
    }

    // If not using connection string, require password
    if (!useConnectionString && !databasePassword) {
      setMigration({
        status: 'error',
        message: 'Database Password is required for migrations',
      });
      return;
    }

    setMigration({ status: 'running', message: 'Running migrations...' });

    try {
      const body = useConnectionString
        ? { connectionString }
        : { supabaseUrl: projectUrl, databasePassword };

      const response = await fetch('/api/setup/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        // Check if this is a connection error that should trigger fallback
        if (data.errorType === 'connection' && !useConnectionString) {
          setShowConnectionFallback(true);
          setMigration({
            status: 'error',
            message:
              'Failed to connect to database - Your network may be blocking PostgreSQL connections (port 5432)',
            errorType: 'connection',
          });
          return;
        }

        // Provide enhanced error messaging
        let errorMessage = data.error || 'Migration failed';
        if (
          errorMessage.includes('password') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('credentials')
        ) {
          errorMessage =
            'Database password is incorrect. Check your password in Supabase Dashboard > Settings > Database. If you forgot it, you can reset it there.';
        } else if (
          errorMessage.includes('permission') ||
          errorMessage.includes('denied')
        ) {
          errorMessage =
            'Permission denied - Make sure you are using the correct database password and that your Supabase project allows connections.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage =
            'Connection timeout - Your database may be paused or your network may be slow. Check your Supabase project status.';
        }

        throw new Error(errorMessage);
      }

      // Privacy: Credentials stay in localStorage only, never sent to central server
      // CLI reads from mason.config.json (which user exports from browser)
      setMigration({ status: 'success', message: 'Migrations completed' });
      setShowConnectionFallback(false);
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
    if (!value) {
      return null;
    }

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

  // Render inline error with recovery guidance
  const InlineErrorWithGuidance = ({
    validation,
  }: {
    validation: ValidationState;
  }) => {
    if (!validation.message) {
      return null;
    }

    return (
      <div className="mt-2 space-y-2">
        {/* Primary error message */}
        <p className="text-sm text-red-400">{validation.message}</p>

        {/* Recovery guidance */}
        {validation.guidance && (
          <div className="rounded-md bg-navy-light/50 p-3 text-sm text-gray-300">
            <strong className="text-gold">How to fix:</strong>{' '}
            {validation.guidance}
          </div>
        )}

        {/* Example of correct format */}
        {validation.example && (
          <div className="text-sm text-gray-400">
            <strong>Example:</strong>{' '}
            <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gold">
              {validation.example}
            </code>
          </div>
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

      <button
        onClick={() => setShowExamples(!showExamples)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 p-4 text-left"
      >
        <span className="font-medium text-white">
          What should my credentials look like?
        </span>
        {showExamples ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {showExamples && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="mb-2 font-medium text-white">Project URL</h4>
              <div className="space-y-1 text-gray-300">
                <p>
                  <span className="text-green-400">Correct:</span>{' '}
                  <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gold">
                    https://abcdefgh.supabase.co
                  </code>
                </p>
                <p>
                  <span className="text-red-400">Wrong:</span>{' '}
                  <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-400 line-through">
                    http://abcdefgh.supabase.co
                  </code>{' '}
                  (must be HTTPS)
                </p>
                <p>
                  <span className="text-red-400">Wrong:</span>{' '}
                  <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gray-400 line-through">
                    https://abcdefgh.supabase.co/
                  </code>{' '}
                  (no trailing slash)
                </p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-white">Anon Key (public)</h4>
              <div className="space-y-1 text-gray-300">
                <p>
                  <span className="text-green-400">Starts with:</span>{' '}
                  <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gold">
                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  </code>
                </p>
                <p className="text-gray-400">
                  Usually 150-250 characters long. Found under "anon public" in
                  Supabase API settings.
                </p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-white">
                Service Role Key (secret)
              </h4>
              <div className="space-y-1 text-gray-300">
                <p>
                  <span className="text-green-400">Starts with:</span>{' '}
                  <code className="rounded bg-gray-800 px-2 py-1 font-mono text-xs text-gold">
                    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                  </code>
                </p>
                <p className="text-gray-400">
                  Usually 250-350 characters long (longer than anon key). Found
                  under "service_role secret" in Supabase API settings.
                </p>
              </div>
            </div>

            <div className="rounded-md bg-yellow-900/20 p-3 text-yellow-200">
              <p className="text-sm">
                <strong>Common mistake:</strong> Mixing up anon key and service
                role key. The service role key is longer and has elevated
                permissions. Make sure you paste each key in the correct field!
              </p>
            </div>
          </div>
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
              content="Found in Supabase Dashboard > Project Settings > API > Project URL. Must be HTTPS and end with .supabase.co (no trailing slash). Example: https://abcdefgh.supabase.co"
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
              className={`h-11 w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
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
          {projectUrl && !urlValidation.isValid && (
            <InlineErrorWithGuidance validation={urlValidation} />
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
              content='The public anonymous key from Supabase. Found in Project Settings > API > "anon public" (not "service_role"). Starts with eyJ and is safe to expose in client-side code. Usually shorter than the service role key.'
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
              className={`h-11 w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
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
          {anonKey && !anonKeyValidation.isValid && (
            <InlineErrorWithGuidance validation={anonKeyValidation} />
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
              content='The secret service key from Supabase. Found in Project Settings > API > "service_role secret" (not "anon public"). Starts with eyJ and is longer than the anon key. Required only for initial table setup. Keep this secret and never commit it to source control!'
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
              className={`h-11 w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
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
          {serviceKey && !serviceKeyValidation.isValid && (
            <InlineErrorWithGuidance validation={serviceKeyValidation} />
          )}
          {(!serviceKey || serviceKeyValidation.isValid) && (
            <p className="mt-1 text-xs text-gray-500">
              Used only for initial table setup. Can be cleared after setup.
            </p>
          )}
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
              content="Found in Supabase Dashboard > Settings > Database > Database password. This is the password you set when creating your Supabase project. If you forgot it, you can reset it in the Database settings. Required to run migrations directly against PostgreSQL."
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
              className={`h-11 w-full rounded-md border bg-black px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none ${
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
          <div className="mt-1 space-y-1">
            <p className="text-xs text-gray-500">
              Required for automatic table setup. Found in Settings {'>'}{' '}
              Database.
            </p>
            {migration.status === 'error' &&
              migration.message?.includes('password') && (
                <p className="text-xs text-yellow-400">
                  Wrong password?{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-gold hover:underline"
                  >
                    Reset it in Supabase Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              )}
          </div>
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
                onClick={() => handleRunMigrations(false)}
                disabled={!databasePassword}
                className="w-full rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Set Up Tables
              </button>
            </>
          )}

          {showConnectionFallback && migration.status === 'error' && (
            <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
              <div>
                <h4 className="font-medium text-white">
                  Connection Troubleshooting
                </h4>
                <p className="mt-1 text-sm text-gray-400">
                  Your network may be blocking direct PostgreSQL connections.
                  This is common on corporate networks or with certain ISPs. You
                  can use a connection string from Supabase instead.
                </p>
              </div>

              <ol className="space-y-2 text-sm text-gray-300">
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
                    </a>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gold">2.</span>
                  <span>
                    Go to <strong>Settings</strong> {'>'}{' '}
                    <strong>Database</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gold">3.</span>
                  <span>
                    Under <strong>Connection string</strong>, select{' '}
                    <strong>URI</strong> tab
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gold">4.</span>
                  <span>
                    Choose <strong>Session</strong> mode (not Transaction)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gold">5.</span>
                  <span>Copy the connection string and paste it below</span>
                </li>
              </ol>

              <div>
                <label
                  htmlFor="connectionString"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Connection String
                </label>
                <input
                  id="connectionString"
                  type="password"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  placeholder="postgresql://postgres.xxx:[YOUR-PASSWORD]@..."
                  className="h-11 w-full rounded-md border border-gray-700 bg-black px-4 py-2 text-white placeholder-gray-500 focus:border-gold focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Make sure to replace [YOUR-PASSWORD] with your actual database
                  password.
                </p>
              </div>

              <button
                onClick={() => handleRunMigrations(true)}
                disabled={!connectionString}
                className="w-full rounded-md bg-gold px-4 py-2 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retry with Connection String
              </button>
            </div>
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
            className="rounded-md border border-gray-700 px-6 py-3 text-gray-300 transition-colors hover:bg-gray-900"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!isStepComplete}
          className="flex-1 rounded-md bg-gold px-6 py-3 font-medium text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default DatabaseStep;
