'use client';

interface PriorityDotsProps {
  value: number; // 1-10 for priority/impact, 1-5 for complexity
  max?: number;
  showLabel?: boolean;
  variant?: 'priority' | 'complexity' | 'effort';
}

export function PriorityDots({
  value,
  max = 5,
  showLabel = false,
  variant = 'priority',
}: PriorityDotsProps) {
  // Normalize value to max dots
  const normalizedValue = Math.round((value / 10) * max);
  const filled = Math.min(Math.max(normalizedValue, 0), max);

  const getColor = () => {
    if (variant === 'effort') {
      return filled >= 4 ? 'bg-orange-400' : 'bg-gray-600';
    }
    if (variant === 'complexity') {
      return filled >= 4 ? 'bg-yellow-400' : 'bg-gray-600';
    }
    // priority - higher is better, use red for critical
    return filled >= 4 ? 'bg-red-400' : 'bg-gray-600';
  };

  const filledColor = getColor();

  const getLabel = () => {
    if (variant === 'effort') {
      if (value <= 3) return 'Low';
      if (value <= 6) return 'Med';
      return 'High';
    }
    if (variant === 'complexity') {
      if (value <= 2) return 'Low';
      if (value <= 3) return 'Med';
      return 'High';
    }
    return '';
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < filled ? filledColor : 'bg-gray-700'
          }`}
        />
      ))}
      {showLabel && (
        <span className="ml-2 text-xs text-gray-400">{getLabel()}</span>
      )}
    </div>
  );
}
