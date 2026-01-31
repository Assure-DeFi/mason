'use client';

import type { BacklogCategory, BacklogType } from '@/types/backlog';

interface BacklogFiltersProps {
  selectedTypes: BacklogType[];
  complexityRange: [number, number];
  effortRange: [number, number];
  onTypesChange: (types: BacklogType[]) => void;
  onComplexityChange: (range: [number, number]) => void;
  onEffortChange: (range: [number, number]) => void;
}

/**
 * New 8-category system with colors matching CategoryBadge
 */
const CATEGORIES: { value: BacklogCategory; label: string; color: string }[] = [
  { value: 'feature', label: 'Feature', color: 'purple' },
  { value: 'ui', label: 'UI', color: 'gold' },
  { value: 'ux', label: 'UX', color: 'cyan' },
  { value: 'api', label: 'API', color: 'green' },
  { value: 'data', label: 'Data', color: 'blue' },
  { value: 'security', label: 'Security', color: 'red' },
  { value: 'performance', label: 'Performance', color: 'orange' },
  { value: 'code-quality', label: 'Code Quality', color: 'gray' },
];

export function BacklogFilters({
  selectedTypes,
  complexityRange,
  effortRange,
  onTypesChange,
  onComplexityChange,
  onEffortChange,
}: BacklogFiltersProps) {
  const toggleType = (type: BacklogType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Category Filter - spans 2 columns on larger screens */}
      <div className="md:col-span-1">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Category
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => toggleType(category.value)}
              className={`block w-full text-left px-3 py-2 border transition-all ${
                selectedTypes.includes(category.value)
                  ? 'border-gold bg-gold/20 text-gold font-medium'
                  : 'border-gray-700 bg-black/20 text-gray-300 hover:bg-white/5'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complexity Range */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Complexity Range
        </label>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Min</span>
              <span className="text-sm font-semibold text-white">
                {complexityRange[0]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={complexityRange[0]}
              onChange={(e) =>
                onComplexityChange([
                  parseInt(e.target.value),
                  complexityRange[1],
                ])
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gold"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Max</span>
              <span className="text-sm font-semibold text-white">
                {complexityRange[1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={complexityRange[1]}
              onChange={(e) =>
                onComplexityChange([
                  complexityRange[0],
                  parseInt(e.target.value),
                ])
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gold"
            />
          </div>
        </div>
      </div>

      {/* Effort Score Range */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Effort Score
        </label>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Min</span>
              <span className="text-sm font-semibold text-white">
                {effortRange[0]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={effortRange[0]}
              onChange={(e) =>
                onEffortChange([parseInt(e.target.value), effortRange[1]])
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gold"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Max</span>
              <span className="text-sm font-semibold text-white">
                {effortRange[1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={effortRange[1]}
              onChange={(e) =>
                onEffortChange([effortRange[0], parseInt(e.target.value)])
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
