import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api-response';
import { extractApiKeyFromHeader, validateApiKey } from '@/lib/auth/api-key';
import { TABLES } from '@/lib/constants';
import {
  checkRateLimit,
  createRateLimitResponse,
  addRateLimitHeaders,
  getRateLimitIdentifier,
} from '@/lib/rate-limit/middleware';
import { createServiceClient } from '@/lib/supabase/client';

// Helper to extract client IP from request
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/backlog/[id] - Get a single backlog item by ID
 * Authorization: Bearer mason_xxxxx
 *
 * Returns the full backlog item details including PRD content.
 *
 * Rate limiting: Standard (100 req/min per user)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     item: { ...BacklogItem }
 *   }
 * }
 *
 * Errors:
 * - 400: Missing item ID
 * - 401: Invalid or missing API key
 * - 404: Item not found
 * - 429: Rate limit exceeded
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Extract and validate API key
    const authHeader = request.headers.get('Authorization');
    const apiKey = extractApiKeyFromHeader(authHeader);

    if (!apiKey) {
      return unauthorized('Missing or invalid Authorization header');
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return unauthorized('Invalid API key');
    }

    // Rate limit check using validated user ID
    const rateLimitId = getRateLimitIdentifier(
      'backlog-get',
      user.github_id,
      getClientIp(request),
    );
    const rateLimitResult = await checkRateLimit(rateLimitId, 'standard');

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Get item ID from route params
    const { id: itemId } = await params;

    if (!itemId) {
      return badRequest('Missing item ID in URL');
    }

    // Validate UUID format to prevent invalid queries
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(itemId)) {
      return badRequest('Invalid item ID format');
    }

    const supabase = createServiceClient();

    // Fetch the item
    // SECURITY: Always filter by user_id to ensure data isolation
    const { data: item, error } = await supabase
      .from(TABLES.PM_BACKLOG_ITEMS)
      .select(
        `
        id,
        created_at,
        updated_at,
        title,
        problem,
        solution,
        area,
        type,
        complexity,
        impact_score,
        effort_score,
        priority_score,
        benefits,
        status,
        branch_name,
        pr_url,
        prd_content,
        prd_generated_at,
        risk_score,
        risk_analyzed_at,
        files_affected_count,
        has_breaking_changes,
        test_coverage_gaps,
        is_new_feature,
        is_banger_idea,
        tags,
        evidence_status,
        evidence_summary,
        source
      `,
      )
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single();

    if (error || !item) {
      return notFound('Backlog item not found');
    }

    const response = apiSuccess({
      item,
    });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    // Log error without exposing details
    // eslint-disable-next-line no-console
    console.error('Error fetching backlog item:', error);
    return serverError();
  }
}
