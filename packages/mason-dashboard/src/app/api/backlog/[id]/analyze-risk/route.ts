import {
  analyzeDependencies,
  calculateOverallRiskScore,
} from '@/lib/analysis/dependency-analyzer';
import { withSessionAndSupabase, type RouteParams } from '@/lib/api/middleware';
import {
  apiSuccess,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api-response';
import { TABLES } from '@/lib/constants';
import { createGitHubClient } from '@/lib/github/client';
import {
  checkRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
  getRateLimitIdentifier,
} from '@/lib/rate-limit/middleware';
import type { BacklogItem } from '@/types/backlog';

/**
 * POST /api/backlog/[id]/analyze-risk
 *
 * Triggers dependency analysis for a backlog item.
 * Requires GitHub token in request body to access repository files.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const handler = withSessionAndSupabase(async ({ userId, userSupabase }) => {
    const { id } = await params;

    // Rate limit check - AI-heavy operation
    const rateLimitId = getRateLimitIdentifier('risk-analysis', userId);
    const rateLimitResult = await checkRateLimit(rateLimitId, 'aiHeavy');

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Parse request body
    const body = await request.json();
    const { githubToken } = body;

    if (!githubToken) {
      return badRequest('GitHub token required for repository analysis');
    }

    // Fetch the backlog item
    const { data: item, error: fetchError } = await userSupabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return notFound('Item not found');
    }

    // Get repository info
    const { data: repo, error: repoError } = await userSupabase
      .from(TABLES.GITHUB_REPOSITORIES)
      .select('github_owner, github_name')
      .eq('id', item.repository_id)
      .single();

    if (repoError || !repo) {
      return notFound('Repository not found');
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
    const { data: analysis, error: analysisError } = await userSupabase
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
      return serverError('Failed to save analysis');
    }

    // Update backlog item with summary fields
    const { error: updateError } = await userSupabase
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
    }

    const response = apiSuccess({
      analysis: {
        ...analysis,
        overall_risk_score: overallRiskScore,
        has_breaking_changes: analysisResult.breaking_changes.length > 0,
      },
    });
    return addRateLimitHeaders(response, rateLimitResult);
  });

  return handler(request);
}
