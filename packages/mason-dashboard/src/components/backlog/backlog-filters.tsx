'use client';

import type { BacklogArea, BacklogType } from '@/types/backlog';

interface BacklogFiltersProps {
  selectedAreas: BacklogArea[];
  selectedTypes: BacklogType[];
  complexityRange: [number, number];
  onAreasChange: (areas: BacklogArea[]) => void;
  onTypesChange: (types: BacklogType[]) => void;
  onComplexityChange: (range: [number, number]) => void;
}

const AREAS: { value: BacklogArea; label: string }[] = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
];

const TYPES: { value: BacklogType; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'auth', label: 'Auth' },
  { value: 'backend', label: 'Backend' },
];

export function BacklogFilters({
  selectedAreas,
  selectedTypes,
  complexityRange,
  onAreasChange,
  onTypesChange,
  onComplexityChange,
}: BacklogFiltersProps) {
  const toggleArea = (area: BacklogArea) => {
    if (selectedAreas.includes(area)) {
      onAreasChange(selectedAreas.filter((a) => a !== area));
    } else {
      onAreasChange([...selectedAreas, area]);
    }
  };

  const toggleType = (type: BacklogType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Area Filter */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Area
        </label>
        <div className="space-y-2">
          {AREAS.map((area) => (
            <button
              key={area.value}
              onClick={() => toggleArea(area.value)}
              className={`block w-full text-left px-3 py-2 border transition-all ${
                selectedAreas.includes(area.value)
                  ? 'border-gold bg-gold/20 text-gold font-medium'
                  : 'border-gray-700 bg-black/20 text-gray-300 hover:bg-white/5'
              }`}
            >
              {area.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Type
        </label>
        <div className="space-y-2">
          {TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => toggleType(type.value)}
              className={`block w-full text-left px-3 py-2 border transition-all ${
                selectedTypes.includes(type.value)
                  ? 'border-gold bg-gold/20 text-gold font-medium'
                  : 'border-gray-700 bg-black/20 text-gray-300 hover:bg-white/5'
              }`}
            >
              {type.label}
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
    </div>
  );
}
