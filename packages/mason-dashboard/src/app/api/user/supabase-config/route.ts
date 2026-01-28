import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServiceClient } from '@/lib/supabase/client';
import { testUserDatabaseConnection } from '@/lib/supabase/user-database';

/**
 * GET /api/user/supabase-config
 * Get the current user's Supabase configuration (URLs only, not keys)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from('mason_users')
      .select('supabase_url, supabase_anon_key')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Failed to get user Supabase config:', error);
      return NextResponse.json(
        { error: 'Failed to get configuration' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      configured: Boolean(user.supabase_url),
      supabaseUrl: user.supabase_url ?? null,
      hasAnonKey: Boolean(user.supabase_anon_key),
      hasServiceRoleKey: false, // Never expose this
    });
  } catch (error) {
    console.error('Error getting Supabase config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/user/supabase-config
 * Save user's Supabase credentials to their profile
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = body;

    // Validate required fields
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Missing Supabase URL' },
        { status: 400 },
      );
    }

    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase Service Role Key' },
        { status: 400 },
      );
    }

    // Validate URL format
    try {
      const url = new URL(supabaseUrl);
      if (!url.hostname.includes('supabase')) {
        return NextResponse.json(
          { error: 'Invalid Supabase URL format' },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid Supabase URL format' },
        { status: 400 },
      );
    }

    // Test connection before saving
    const connectionTest = await testUserDatabaseConnection(
      supabaseUrl,
      supabaseServiceRoleKey,
    );

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          error: `Connection failed: ${connectionTest.error}`,
          details:
            'Please verify your Supabase URL and Service Role Key are correct',
        },
        { status: 400 },
      );
    }

    // Save to user's profile in central database
    const supabase = createServiceClient();

    const { error: updateError } = await supabase
      .from('mason_users')
      .update({
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseAnonKey ?? null,
        supabase_service_role_key: supabaseServiceRoleKey,
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Failed to save Supabase config:', updateError);
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving Supabase config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/user/supabase-config
 * Clear user's Supabase credentials from their profile
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { error: updateError } = await supabase
      .from('mason_users')
      .update({
        supabase_url: null,
        supabase_anon_key: null,
        supabase_service_role_key: null,
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Failed to clear Supabase config:', updateError);
      return NextResponse.json(
        { error: 'Failed to clear configuration' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase configuration cleared',
    });
  } catch (error) {
    console.error('Error clearing Supabase config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
