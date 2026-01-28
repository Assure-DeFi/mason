import { Client } from 'pg';

interface MigrationResult {
  success: boolean;
  error?: string;
}

/**
 * Extract region from Supabase project URL
 * This is a best-effort guess - defaults to us-east-1 if unknown
 */
function guessRegion(_projectRef: string): string {
  // Supabase pooler endpoints use aws-0-{region}.pooler.supabase.com
  // Common regions: us-east-1, us-west-1, eu-west-1, ap-southeast-1
  // Default to us-east-1 as it's the most common
  return 'us-east-1';
}

/**
 * Build PostgreSQL connection string from Supabase credentials
 *
 * Supabase connection format:
 * - Direct: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
 * - Pooler: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * We use the pooler endpoint as it's more reliable for one-off connections
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

  const region = guessRegion(projectRef);

  // Use pooler endpoint for better connection handling
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(databasePassword)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

/**
 * Run migrations directly against PostgreSQL database
 *
 * This bypasses the Supabase REST API (PostgREST) which cannot execute DDL statements.
 * Instead, we connect directly to the PostgreSQL database using the pg package.
 */
export async function runMigrations(
  supabaseUrl: string,
  databasePassword: string,
  migrationSql: string,
): Promise<MigrationResult> {
  const connectionString = buildConnectionString(supabaseUrl, databasePassword);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
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
      };
    }

    if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED')
    ) {
      return {
        success: false,
        error:
          'Could not connect to database. Check your Supabase URL and ensure your project is active.',
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        success: false,
        error: 'Connection timed out. Please try again.',
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
    ssl: { rejectUnauthorized: false },
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

    return {
      success: false,
      error: errorMessage,
    };
  } finally {
    await client.end();
  }
}
