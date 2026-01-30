/**
 * Analytics utility functions for Mason dashboard
 * Pure functions that operate on BacklogItem arrays
 */

import {
  startOfWeek,
  startOfMonth,
  format,
  differenceInDays,
  parseISO,
  isSameDay,
  subDays,
  isAfter,
  isBefore,
  startOfDay,
} from 'date-fns';

import type { BacklogItem, BacklogArea, BacklogType } from '@/types/backlog';

export interface TimePeriodCount {
  date: string;
  count: number;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
}

export type CategoryBreakdown = Record<BacklogArea, number>;

export type TypeBreakdown = Record<BacklogType, number>;

/**
 * Get completed items grouped by week or month
 * Returns array sorted by date ascending
 */
export function getCompletionsByTimePeriod(
  items: BacklogItem[],
  period: 'week' | 'month',
): TimePeriodCount[] {
  const completedItems = items.filter((item) => item.status === 'completed');

  if (completedItems.length === 0) {
    return [];
  }

  const groupedCounts = new Map<string, number>();

  for (const item of completedItems) {
    const date = parseISO(item.updated_at);
    const periodStart =
      period === 'week'
        ? startOfWeek(date, { weekStartsOn: 1 })
        : startOfMonth(date);
    const key = format(periodStart, 'yyyy-MM-dd');

    groupedCounts.set(key, (groupedCounts.get(key) ?? 0) + 1);
  }

  const result: TimePeriodCount[] = [];
  groupedCounts.forEach((count, date) => {
    result.push({ date, count });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get technical debt burndown data
 * Shows cumulative remaining items over time based on completion dates
 * Returns array sorted by date ascending
 */
export function getTechnicalDebtBurndown(
  items: BacklogItem[],
): BurndownPoint[] {
  const completedItems = items
    .filter((item) => item.status === 'completed')
    .map((item) => ({
      date: parseISO(item.updated_at),
      item,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (completedItems.length === 0) {
    return [];
  }

  const totalItems = items.length;
  const result: BurndownPoint[] = [];

  // Start with all items as remaining
  let remaining = totalItems;
  let completedSoFar = 0;

  // Group completions by day
  const completionsByDay = new Map<string, number>();
  for (const { date } of completedItems) {
    const dayKey = format(startOfDay(date), 'yyyy-MM-dd');
    completionsByDay.set(dayKey, (completionsByDay.get(dayKey) ?? 0) + 1);
  }

  // Build burndown points
  const sortedDays = Array.from(completionsByDay.keys()).sort();
  for (const dayKey of sortedDays) {
    const completedOnDay = completionsByDay.get(dayKey) ?? 0;
    completedSoFar += completedOnDay;
    remaining = totalItems - completedSoFar;

    result.push({
      date: dayKey,
      remaining,
    });
  }

  return result;
}

/**
 * Get breakdown of items by area (frontend/backend)
 */
export function getCategoryBreakdown(items: BacklogItem[]): CategoryBreakdown {
  const breakdown: CategoryBreakdown = {
    frontend: 0,
    backend: 0,
  };

  for (const item of items) {
    if (item.area in breakdown) {
      breakdown[item.area]++;
    }
  }

  return breakdown;
}

/**
 * Get breakdown of items by type (dashboard, feature, etc.)
 */
export function getTypeBreakdown(items: BacklogItem[]): TypeBreakdown {
  const breakdown: TypeBreakdown = {
    dashboard: 0,
    discovery: 0,
    auth: 0,
    backend: 0,
    feature: 0,
  };

  for (const item of items) {
    if (item.type in breakdown) {
      breakdown[item.type]++;
    }
  }

  return breakdown;
}

/**
 * Calculate average completion time in days
 * Measures time from created_at to updated_at for completed items
 * Returns null if no completed items exist
 */
export function getAverageCompletionTime(items: BacklogItem[]): number | null {
  const completedItems = items.filter((item) => item.status === 'completed');

  if (completedItems.length === 0) {
    return null;
  }

  let totalDays = 0;

  for (const item of completedItems) {
    const createdAt = parseISO(item.created_at);
    const updatedAt = parseISO(item.updated_at);
    const days = differenceInDays(updatedAt, createdAt);
    totalDays += Math.max(days, 0); // Ensure non-negative
  }

  return totalDays / completedItems.length;
}

/**
 * Count consecutive days with at least one completion
 * Counts backwards from the most recent completion date
 * Returns 0 if no completed items exist
 */
export function getCompletionStreak(items: BacklogItem[]): number {
  const completedItems = items.filter((item) => item.status === 'completed');

  if (completedItems.length === 0) {
    return 0;
  }

  // Get unique completion dates
  const completionDates = new Set<string>();
  for (const item of completedItems) {
    const date = parseISO(item.updated_at);
    completionDates.add(format(startOfDay(date), 'yyyy-MM-dd'));
  }

  if (completionDates.size === 0) {
    return 0;
  }

  // Find the most recent completion date
  const sortedDates = Array.from(completionDates).sort().reverse();
  const mostRecentDate = parseISO(sortedDates[0]);

  // Count consecutive days backwards
  let streak = 0;
  let currentDate = mostRecentDate;
  let keepChecking = true;

  while (keepChecking) {
    const dateKey = format(currentDate, 'yyyy-MM-dd');
    if (completionDates.has(dateKey)) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else {
      keepChecking = false;
    }
  }

  return streak;
}

/**
 * Get velocity - average completions per week over a time range
 * Returns null if insufficient data
 */
export function getVelocity(
  items: BacklogItem[],
  weeks: number = 4,
): number | null {
  const completedItems = items.filter((item) => item.status === 'completed');

  if (completedItems.length === 0) {
    return null;
  }

  const cutoffDate = subDays(new Date(), weeks * 7);

  const recentCompletions = completedItems.filter((item) => {
    const completedAt = parseISO(item.updated_at);
    return isAfter(completedAt, cutoffDate);
  });

  if (recentCompletions.length === 0) {
    return null;
  }

  return recentCompletions.length / weeks;
}

/**
 * Get items completed within a date range
 */
export function getCompletionsInRange(
  items: BacklogItem[],
  startDate: Date,
  endDate: Date,
): BacklogItem[] {
  return items.filter((item) => {
    if (item.status !== 'completed') {
      return false;
    }

    const completedAt = parseISO(item.updated_at);
    return (
      (isAfter(completedAt, startDate) || isSameDay(completedAt, startDate)) &&
      (isBefore(completedAt, endDate) || isSameDay(completedAt, endDate))
    );
  });
}
