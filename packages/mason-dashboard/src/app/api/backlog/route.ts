import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import type { BacklogFilters, BacklogSort } from '@/types/backlog';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filters from query params
    const filters: BacklogFilters = {};

    const statusParam = searchParams.get('status');
    if (statusParam) {
      filters.status = statusParam.split(',') as BacklogFilters['status'];
    }

    const areaParam = searchParams.get('area');
    if (areaParam) {
      filters.area = areaParam.split(',') as BacklogFilters['area'];
    }

    const typeParam = searchParams.get('type');
    if (typeParam) {
      filters.type = typeParam.split(',') as BacklogFilters['type'];
    }

    const searchParam = searchParams.get('search');
    if (searchParam) {
      filters.search = searchParam;
    }

    // Parse sort
    const sortField = searchParams.get('sortField') ?? 'priority_score';
    const sortDirection = searchParams.get('sortDirection') ?? 'desc';
    const sort: BacklogSort = {
      field: sortField as BacklogSort['field'],
      direction: sortDirection as BacklogSort['direction'],
    };

    // Parse pagination
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10);

    // Build query
    const supabase = createServerClient();
    let query = supabase
      .from('pm_backlog_items')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters.area?.length) {
      query = query.in('area', filters.area);
    }
    if (filters.type?.length) {
      query = query.in('type', filters.type);
    }
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,problem.ilike.%${filters.search}%,solution.ilike.%${filters.search}%`,
      );
    }

    // Apply sort
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch backlog items' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      items: data,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
