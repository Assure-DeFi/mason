import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
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

    const supabase = createServiceClient();

    // Create analysis run record
    const { data: analysisRun, error: runError } = await supabase
      .from('pm_analysis_runs')
      .insert({
        mode: body.mode,
        items_found: body.items.length,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'completed',
      })
      .select('id')
      .single();

    if (runError || !analysisRun) {
      console.error('Failed to create analysis run:', runError);
      return NextResponse.json(
        { error: 'Failed to create analysis run' },
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
      priority_score: item.impact_score * 2 - item.effort_score,
      status: 'new' as const,
      analysis_run_id: analysisRun.id,
      user_id: user.id,
    }));

    // Insert all backlog items
    const { error: itemsError } = await supabase
      .from('pm_backlog_items')
      .insert(backlogItems);

    if (itemsError) {
      console.error('Failed to insert backlog items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to insert backlog items' },
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
