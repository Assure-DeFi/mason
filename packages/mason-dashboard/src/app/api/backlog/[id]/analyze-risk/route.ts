import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import {
  analyzeDependencies,
  calculateOverallRiskScore,
} from '@/lib/analysis/dependency-analyzer';
import { authOptions } from '@/lib/auth/auth-options';
import { TABLES } from '@/lib/constants';
import { createGitHubClient } from '@/lib/github/client';
import { createServiceClient } from '@/lib/supabase/client';
import type { BacklogItem } from '@/types/backlog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get a Supabase client connected to the user's database.
 */
async function getUserDatabaseClient(githubId: string) {
  const centralClient = createServiceClient();

  const { data: user, error } = await centralClient
    .from('mason_users')
    .select('supabase_url, supabase_anon_key')
    .eq('github_id', githubId)
    .single();

  if (error || !user?.supabase_url || !user?.supabase_anon_key) {
    return null;
  }

  return createClient(user.supabase_url, user.supabase_anon_key);
}

/**
 * POST /api/backlog/[id]/analyze-risk
 *
 * Triggers dependency analysis for a backlog item.
 * Requires GitHub token in request body to access repository files.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.github_id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { githubToken } = body;

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token required for repository analysis' },
        { status: 400 },
      );
    }

    // Connect to user's database
    const supabase = await getUserDatabaseClient(session.user.github_id);
    if (!supabase) {
      return NextResponse.json(
        { error: 'User database not configured. Please complete setup.' },
        { status: 400 },
      );
    }

    // Fetch the backlog item
    const { data: item, error: fetchError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get repository info
    const { data: repo, error: repoError } = await supabase
      .from(TABLES.GITHUB_REPOSITORIES)
      .select('github_owner, github_name')
      .eq('id', item.repository_id)
      .single();

    if (repoError || !repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 },
      );
    }

    // Create GitHub client
    const octokit = createGitHubClient(githubToken);

    // Run dependency analysis
    const analysisResult = await analyzeDependencies(
      octokit,
      repo.github_owner,
      repo.github_name,
      item as BacklogItem,
    );

    // Calculate overall risk score
    const overallRiskScore = calculateOverallRiskScore({
      file_count_score: analysisResult.file_count_score,
      dependency_depth_score: analysisResult.dependency_depth_score,
      test_coverage_score: analysisResult.test_coverage_score,
      cascade_potential_score: analysisResult.cascade_potential_score,
      api_surface_score: analysisResult.api_surface_score,
    });

    // Upsert analysis into dependency_analysis table
    const { data: analysis, error: analysisError } = await supabase
      .from(TABLES.DEPENDENCY_ANALYSIS)
      .upsert(
        {
          item_id: id,
          ...analysisResult,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'item_id',
        },
      )
      .select()
      .single();

    if (analysisError) {
      console.error('Failed to save analysis:', analysisError);
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 },
      );
    }

    // Update backlog item with summary fields
    const { error: updateError } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .update({
        risk_score: overallRiskScore,
        risk_analyzed_at: new Date().toISOString(),
        files_affected_count: analysisResult.affected_files.length,
        has_breaking_changes: analysisResult.breaking_changes.length > 0,
        test_coverage_gaps: analysisResult.files_without_tests.length,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update item with risk summary:', updateError);
      // Continue anyway - analysis is saved
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        overall_risk_score: overallRiskScore,
        has_breaking_changes: analysisResult.breaking_changes.length > 0,
      },
    });
  } catch (err) {
    console.error('Risk analysis error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 },
    );
  }
}
