import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  return _supabase;
}

// Alias for backwards compatibility
export const supabase = {
  from: (...args: Parameters<SupabaseClient['from']>) =>
    getSupabase().from(...args),
};

// Server-side client (for API routes - uses anon key)
export function createServerClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Service role client (for elevated operations - bypasses RLS)
// Use only for server-side operations requiring admin access
export function createServiceClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Required for service role operations.',
    );
  }

  if (!_serviceClient) {
    _serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return _serviceClient;
}
