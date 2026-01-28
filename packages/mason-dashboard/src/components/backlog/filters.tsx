'use client';

import { useState } from 'react';
import type {
  BacklogFilters,
  BacklogStatus,
  BacklogArea,
  BacklogType,
} from '@/types/backlog';
import { Search, Filter, X } from 'lucide-react';
import { clsx } from 'clsx';

interface FiltersProps {
  filters: BacklogFilters;
  onFiltersChange: (filters: BacklogFilters) => void;
}

const STATUS_OPTIONS: BacklogStatus[] = [
  'new',
  'approved',
  'in_progress',
  'completed',
  'rejected',
];

const AREA_OPTIONS: BacklogArea[] = [
  'frontend-ux',
  'api-backend',
  'reliability',
  'security',
  'code-quality',
];

const TYPE_OPTIONS: BacklogType[] = [
  'feature',
  'fix',
  'refactor',
  'optimization',
];

export function Filters({ filters, onFiltersChange }: FiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(filters.search ?? '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search });
  };

  const toggleFilter = <T extends string>(
    key: keyof BacklogFilters,
    value: T,
  ) => {
    const current = (filters[key] as T[] | undefined) ?? [];
    const newValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onFiltersChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const clearFilters = () => {
    setSearch('');
    onFiltersChange({});
  };

  const hasActiveFilters =
    (filters.status?.length ?? 0) > 0 ||
    (filters.area?.length ?? 0) > 0 ||
    (filters.type?.length ?? 0) > 0 ||
    filters.search;

  return (
    <div className="space-y-4">
      {/* Search and toggle */}
      <div className="flex gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </form>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
            showFilters || hasActiveFilters
              ? 'bg-gold/20 border-gold text-gold'
              : 'bg-black/30 border-gray-800 text-gray-400 hover:text-white',
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-gold rounded-full" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Filter panels */}
      {showFilters && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-black/20 border border-gray-800 rounded-lg">
          {/* Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Status</h4>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleFilter('status', status)}
                  className={clsx(
                    'px-2 py-1 text-xs rounded transition-colors',
                    filters.status?.includes(status)
                      ? 'bg-gold text-navy'
                      : 'bg-gray-800 text-gray-400 hover:text-white',
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Area */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Area</h4>
            <div className="flex flex-wrap gap-2">
              {AREA_OPTIONS.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleFilter('area', area)}
                  className={clsx(
                    'px-2 py-1 text-xs rounded transition-colors',
                    filters.area?.includes(area)
                      ? 'bg-gold text-navy'
                      : 'bg-gray-800 text-gray-400 hover:text-white',
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Type</h4>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleFilter('type', type)}
                  className={clsx(
                    'px-2 py-1 text-xs rounded transition-colors',
                    filters.type?.includes(type)
                      ? 'bg-gold text-navy'
                      : 'bg-gray-800 text-gray-400 hover:text-white',
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
