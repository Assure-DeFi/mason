import { Client, type ConnectionConfig } from 'pg';

interface MigrationResult {
  success: boolean;
  error?: string;
  errorType?: 'connection' | 'auth' | 'unknown';
}

/**
 * Get SSL configuration based on environment
 *
 * In production, SSL certificate verification is enabled to prevent MITM attacks.
 * In development, verification is disabled to allow self-signed certificates.
 *
 * Can be overridden with DB_SSL_REJECT_UNAUTHORIZED environment variable.
 */
function getSslConfig(): ConnectionConfig['ssl'] {
  // Allow explicit override via environment variable
  const envOverride = process.env.DB_SSL_REJECT_UNAUTHORIZED;
  if (envOverride !== undefined) {
    return { rejectUnauthorized: envOverride === 'true' };
  }

  // Default: verify certificates in production, skip in development
  const isProduction = process.env.NODE_ENV === 'production';
  return { rejectUnauthorized: isProduction };
}

/**
 * Build PostgreSQL connection string from Supabase credentials
 *
 * Supabase connection format:
 * - Direct: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
 * - Pooler: postgresql://postgres.[project-ref]:[password]@[pooler-host]:6543/postgres
 *
 * We use the DIRECT connection because the pooler hostname varies (aws-0, aws-1, etc.)
 * and using the wrong pooler server causes "Tenant or user not found" errors.
 * The direct connection (db.project-ref.supabase.co) is consistent across all projects.
 */
function buildConnectionString(
  supabaseUrl: string,
  databasePassword: string,
): string {
  // Extract project ref from URL (e.g., https://abc123.supabase.co -> abc123)
  const projectRef = supabaseUrl
    .replace('https://', '')
    .replace('.supabase.co', '')
    .replace(/\/$/, '');

  // Use direct database connection (not pooler) to avoid "Tenant or user not found" errors
  // that occur when the pooler hostname doesn't match the project's assigned server
  return `postgresql://postgres:${encodeURIComponent(databasePassword)}@db.${projectRef}.supabase.co:5432/postgres`;
}

/**
 * Check if an error is a connection-related error (vs auth error)
 * Connection errors should trigger the fallback UI
 */
function isConnectionError(errorMessage: string): boolean {
  const connectionErrorPatterns = [
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENETUNREACH',
    'ENOTFOUND',
    'timeout',
    'Tenant or user not found',
    'getaddrinfo',
    'connect EHOSTUNREACH',
  ];
  return connectionErrorPatterns.some((pattern) =>
    errorMessage.includes(pattern),
  );
}

/**
 * Run migrations directly against PostgreSQL database
 *
 * This bypasses the Supabase REST API (PostgREST) which cannot execute DDL statements.
 * Instead, we connect directly to the PostgreSQL database using the pg package.
 *
 * @param supabaseUrl - The Supabase project URL
 * @param databasePassword - The database password
 * @param migrationSql - The SQL to run
 * @param connectionString - Optional: direct connection string (bypasses URL construction)
 */
export async function runMigrations(
  supabaseUrl: string,
  databasePassword: string,
  migrationSql: string,
  connectionString?: string,
): Promise<MigrationResult> {
  const connStr =
    connectionString || buildConnectionString(supabaseUrl, databasePassword);

  const client = new Client({
    connectionString: connStr,
    ssl: getSslConfig(),
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();

    // Execute the full migration SQL
    // PostgreSQL can handle multiple statements in a single query
    await client.query(migrationSql);

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Migration failed';

    // Provide helpful error messages for common issues
    if (errorMessage.includes('password authentication failed')) {
      return {
        success: false,
        error:
          'Database password is incorrect. Check your password in Supabase Dashboard > Settings > Database.',
        errorType: 'auth',
      };
    }

    // Check for connection-related errors that should trigger fallback UI
    if (isConnectionError(errorMessage)) {
      return {
        success: false,
        error:
          'Could not connect to database. Your network may be blocking direct PostgreSQL connections (port 5432). Try using a connection string from Supabase Dashboard.',
        errorType: 'connection',
      };
    }

    return {
      success: false,
      error: errorMessage,
      errorType: 'unknown',
    };
  } finally {
    await client.end();
  }
}

/**
 * Test database connection without running migrations
 */
export async function testDatabaseConnection(
  supabaseUrl: string,
  databasePassword: string,
): Promise<MigrationResult> {
  const connectionString = buildConnectionString(supabaseUrl, databasePassword);

  const client = new Client({
    connectionString,
    ssl: getSslConfig(),
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Connection failed';

    if (errorMessage.includes('password authentication failed')) {
      return {
        success: false,
        error:
          'Database password is incorrect. Check your password in Supabase Dashboard > Settings > Database.',
      };
    }

    if (errorMessage.includes('Tenant or user not found')) {
      return {
        success: false,
        error:
          'Could not find your Supabase project. Please verify your Project URL is correct in Supabase Dashboard > Settings > API.',
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    await client.end();
  }
}
