/**
 * Mason Recommendation Engine
 *
 * Provides intelligent recommendations for which backlog items to work on next.
 */

import type { BacklogItem, BacklogArea } from '@/types/backlog';

/**
 * A recommendation for a backlog item with reasoning
 */
export interface Recommendation {
  item: BacklogItem;
  reasoning: string;
  score: number;
  tags: string[];
}

/**
 * Check if an item qualifies as a quick win
 * Quick wins: high impact (>=7) + low effort (<=3)
 */
function isQuickWin(item: BacklogItem): boolean {
  return item.impact_score >= 7 && item.effort_score <= 3;
}

/**
 * Get items in the same area
 */
function getItemsInArea(
  items: BacklogItem[],
  area: BacklogArea,
): BacklogItem[] {
  return items.filter((item) => item.area === area);
}

/**
 * Count how many other items share the same area (potential synergy)
 */
function getAreaSynergyCount(items: BacklogItem[], item: BacklogItem): number {
  return items.filter(
    (other) =>
      other.id !== item.id &&
      other.area === item.area &&
      other.status === 'new',
  ).length;
}

/**
 * Build tags for a recommendation
 */
function buildTags(item: BacklogItem, areaSynergyCount: number): string[] {
  const tags: string[] = [];

  if (isQuickWin(item)) {
    tags.push('quick-win');
  }

  if (item.impact_score >= 8) {
    tags.push('high-impact');
  }

  if (item.effort_score <= 2) {
    tags.push('low-effort');
  }

  if (item.area === 'frontend') {
    tags.push('frontend-focus');
  } else if (item.area === 'backend') {
    tags.push('backend-focus');
  }

  if (areaSynergyCount >= 3) {
    tags.push('area-synergy');
  }

  if (item.risk_score !== null && item.risk_score <= 3) {
    tags.push('low-risk');
  }

  if (item.is_banger_idea) {
    tags.push('banger-idea');
  }

  if (item.is_new_feature) {
    tags.push('new-feature');
  }

  return tags;
}

/**
 * Build reasoning string for a recommendation
 */
function buildReasoning(
  item: BacklogItem,
  areaSynergyCount: number,
  items: BacklogItem[],
): string {
  const reasons: string[] = [];

  // Quick win reasoning (highest priority)
  if (isQuickWin(item)) {
    reasons.push('Quick win - high impact with minimal effort');
  }

  // High priority reasoning
  if (item.priority_score >= 10) {
    reasons.push(`High priority - strong impact score of ${item.impact_score}`);
  }

  // Area synergy reasoning
  if (areaSynergyCount >= 2) {
    const areaItems = getItemsInArea(items, item.area).filter(
      (other) => other.id !== item.id && other.status === 'new',
    );
    if (areaItems.length > 0) {
      const otherItem = areaItems[0];
      reasons.push(`Pairs well with "${otherItem.title}" - same area focus`);
    }
  }

  // Unblocks other items reasoning
  if (areaSynergyCount >= 3) {
    reasons.push(
      `Unblocks ${areaSynergyCount} other items in ${item.area} area`,
    );
  }

  // Low risk reasoning
  if (item.risk_score !== null && item.risk_score <= 3) {
    reasons.push('Low risk implementation');
  }

  // Default reasoning if none matched
  if (reasons.length === 0) {
    if (item.impact_score >= 7) {
      reasons.push(`High impact score of ${item.impact_score}`);
    } else if (item.effort_score <= 3) {
      reasons.push('Low effort implementation');
    } else {
      reasons.push(`Priority score of ${item.priority_score}`);
    }
  }

  return reasons.join('. ');
}

/**
 * Calculate recommendation score for an item
 *
 * Scoring factors:
 * - Base: priority_score (impact * 2 - effort)
 * - Quick win bonus: +5 points
 * - Area synergy bonus: +1 per related item (max +3)
 * - Low risk bonus: +2 if risk_score <= 3
 * - Banger idea bonus: +3 if marked as banger
 */
function calculateRecommendationScore(
  item: BacklogItem,
  areaSynergyCount: number,
): number {
  let score = item.priority_score;

  // Quick win bonus
  if (isQuickWin(item)) {
    score += 5;
  }

  // Area synergy bonus (max +3)
  score += Math.min(areaSynergyCount, 3);

  // Low risk bonus
  if (item.risk_score !== null && item.risk_score <= 3) {
    score += 2;
  }

  // Banger idea bonus
  if (item.is_banger_idea) {
    score += 3;
  }

  return score;
}

/**
 * Get recommended backlog items with reasoning
 *
 * @param items - All backlog items to consider
 * @param limit - Maximum number of recommendations to return (default: 5)
 * @returns Array of recommendations sorted by score descending
 */
export function getRecommendedItems(
  items: BacklogItem[],
  limit: number = 5,
): Recommendation[] {
  // Filter to only new items (not yet approved)
  const eligibleItems = items.filter((item) => item.status === 'new');

  // Build recommendations for each eligible item
  const recommendations: Recommendation[] = eligibleItems.map((item) => {
    const areaSynergyCount = getAreaSynergyCount(eligibleItems, item);
    const score = calculateRecommendationScore(item, areaSynergyCount);
    const reasoning = buildReasoning(item, areaSynergyCount, eligibleItems);
    const tags = buildTags(item, areaSynergyCount);

    return {
      item,
      reasoning,
      score,
      tags,
    };
  });

  // Sort by score descending and limit
  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Get quick wins from the backlog
 *
 * @param items - All backlog items
 * @param limit - Maximum number to return (default: 3)
 * @returns Quick win items sorted by priority
 */
export function getQuickWins(
  items: BacklogItem[],
  limit: number = 3,
): BacklogItem[] {
  return items
    .filter((item) => item.status === 'new' && isQuickWin(item))
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, limit);
}

/**
 * Get items grouped by area for batch execution
 *
 * @param items - All backlog items
 * @param area - Area to filter by
 * @returns Items in the specified area sorted by priority
 */
export function getItemsByArea(
  items: BacklogItem[],
  area: BacklogArea,
): BacklogItem[] {
  return items
    .filter((item) => item.area === area && item.status === 'new')
    .sort((a, b) => b.priority_score - a.priority_score);
}
