import { NextResponse } from 'next/server';

import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/v1/backlog/next - Get the highest-priority approved backlog items
 * Authorization: Bearer mason_xxxxx
 *
 * Query params:
 * - repository_id (optional): Filter by specific repository
 * - limit (optional): Maximum number of items to return (no limit if omitted)
 *
 * Returns the approved item(s) with highest priority score, ready for execution.
 */
export async function GET(request: Request) {
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

    // Parse query parameters
    const url = new URL(request.url);
    const repositoryId = url.searchParams.get('repository_id');
    const limitParam = url.searchParams.get('limit');
    // If no limit specified, fetch all approved items (no cap)
    const limit = limitParam
      ? Math.max(parseInt(limitParam, 10), 1)
      : undefined;

    const supabase = createServiceClient();

    // Build query for approved items ordered by priority
    let query = supabase
      .from('mason_pm_backlog_items')
      .select(
        `
        id,
        title,
        problem,
        solution,
        area,
        type,
        complexity,
        impact_score,
        effort_score,
        priority_score,
        benefits_json,
        status,
        branch_name,
        pr_url,
        prd_content,
        analysis_run_id,
        repository_id,
        created_at,
        updated_at
      `,
      )
      .eq('status', 'approved')
      .order('priority_score', { ascending: false });

    // Apply limit only if specified
    if (limit) {
      query = query.limit(limit);
    }

    // Filter by repository if specified
    if (repositoryId) {
      query = query.eq('repository_id', repositoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch next backlog item:', error);
      return NextResponse.json(
        { error: 'Failed to fetch backlog items' },
        { status: 500 },
      );
    }

    // No approved items found
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          items: [],
          message: 'No approved items available for execution',
        },
        { status: 200 },
      );
    }

    // Transform benefits_json to benefits array for consistency
    const items = data.map((item) => ({
      ...item,
      benefits: item.benefits_json || [],
    }));

    // Return single item or array based on limit
    if (limit === 1) {
      return NextResponse.json({
        item: items[0],
        total_approved: data.length,
      });
    }

    return NextResponse.json({
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching next backlog item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
