import { NextResponse } from 'next/server';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
import { createUserDatabaseClient } from '@/lib/supabase/user-database';
import type { BacklogArea, BacklogType, Benefit } from '@/types/backlog';

/**
 * Analysis item as submitted by the CLI
 */
interface AnalysisItem {
  title: string;
  problem: string;
  solution: string;
  type: BacklogType;
  area: BacklogArea;
  impact_score: number;
  effort_score: number;
  complexity: number;
  benefits: Benefit[];
}

/**
 * Request body for analysis submission
 */
interface AnalysisRequest {
  mode: string;
  repository?: string;
  items: AnalysisItem[];
}

/**
 * POST /api/v1/analysis - Submit analysis results from CLI
 * Authorization: Bearer mason_xxxxx
 *
 * PRIVACY: Data is stored in the USER'S own Supabase database, not the central platform database.
 * This implements the BYOD (Bring Your Own Database) architecture.
 */
export async function POST(request: Request) {
  try {
    // Extract and validate API key
    const authHeader = request.headers.get('Authorization');
    const apiKey = extractApiKeyFromHeader(authHeader);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 },
      );
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Parse request body
    const body: AnalysisRequest = await request.json();

    if (!body.mode) {
      return NextResponse.json(
        { error: 'Missing required field: mode' },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty items array' },
        { status: 400 },
      );
    }

    // Validate each item has required fields
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const missingFields: string[] = [];

      if (!item.title) missingFields.push('title');
      if (!item.problem) missingFields.push('problem');
      if (!item.solution) missingFields.push('solution');
      if (!item.type) missingFields.push('type');
      if (!item.area) missingFields.push('area');
      if (typeof item.impact_score !== 'number')
        missingFields.push('impact_score');
      if (typeof item.effort_score !== 'number')
        missingFields.push('effort_score');
      if (typeof item.complexity !== 'number') missingFields.push('complexity');
      if (!Array.isArray(item.benefits)) missingFields.push('benefits');

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: `Item ${i} missing required fields: ${missingFields.join(', ')}`,
          },
          { status: 400 },
        );
      }
    }

    // Get user's own Supabase client - data goes to THEIR database, not ours
    const userDb = await createUserDatabaseClient(user.id);

    if (!userDb) {
      return NextResponse.json(
        {
          error: 'User database not configured',
          details:
            'Please complete setup in the dashboard to configure your Supabase database.',
        },
        { status: 400 },
      );
    }

    // Create analysis run record in USER'S database
    const { data: analysisRun, error: runError } = await userDb
      .from('mason_pm_analysis_runs')
      .insert({
        mode: body.mode,
        items_found: body.items.length,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'completed',
        user_id: user.id,
      })
      .select('id')
      .single();

    if (runError || !analysisRun) {
      console.error('Failed to create analysis run in user DB:', runError);
      return NextResponse.json(
        {
          error: 'Failed to create analysis run',
          details: runError?.message,
        },
        { status: 500 },
      );
    }

    // Prepare backlog items for insertion
    const backlogItems = body.items.map((item) => ({
      title: item.title,
      problem: item.problem,
      solution: item.solution,
      type: item.type,
      area: item.area,
      impact_score: item.impact_score,
      effort_score: item.effort_score,
      complexity: item.complexity,
      benefits: item.benefits,
      status: 'new' as const,
      analysis_run_id: analysisRun.id,
      user_id: user.id,
    }));

    // Insert all backlog items into USER'S database
    const { error: itemsError } = await userDb
      .from('mason_pm_backlog_items')
      .insert(backlogItems);

    if (itemsError) {
      console.error('Failed to insert backlog items in user DB:', itemsError);
      return NextResponse.json(
        {
          error: 'Failed to insert backlog items',
          details: itemsError.message,
        },
        { status: 500 },
      );
    }

    // Construct dashboard URL
    const dashboardUrl =
      process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://mason.assuredefi.com';

    return NextResponse.json({
      success: true,
      analysis_run_id: analysisRun.id,
      items_created: body.items.length,
      dashboard_url: `${dashboardUrl}/admin/backlog`,
    });
  } catch (error) {
    console.error('Analysis submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
