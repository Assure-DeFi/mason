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

  // Get color based on variant and current dot position
  const getFilledColor = (dotIndex: number) => {
    if (variant === 'complexity') {
      // Graduated colors: green (low) -> yellow (med) -> red (high)
      if (dotIndex < 2) {return 'bg-emerald-500';}
      if (dotIndex < 3) {return 'bg-yellow-500';}
      if (dotIndex < 4) {return 'bg-orange-500';}
      return 'bg-red-500';
    }
    if (variant === 'effort') {
      // Similar gradient for effort
      if (dotIndex < 2) {return 'bg-emerald-500';}
      if (dotIndex < 3) {return 'bg-yellow-500';}
      if (dotIndex < 4) {return 'bg-orange-500';}
      return 'bg-red-500';
    }
    // priority - higher is better, use gold accent for high priority
    if (dotIndex >= 4) {return 'bg-red-400';}
    if (dotIndex >= 3) {return 'bg-orange-400';}
    return 'bg-blue-400';
  };

  const getLabel = () => {
    if (variant === 'effort') {
      if (value <= 3) {return 'Low';}
      if (value <= 6) {return 'Med';}
      return 'High';
    }
    if (variant === 'complexity') {
      if (value <= 2) {return 'Low';}
      if (value <= 3) {return 'Med';}
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
            i < filled ? getFilledColor(i) : 'bg-gray-700/50'
          }`}
        />
      ))}
      {showLabel && (
        <span className="ml-2 text-xs text-gray-400">{getLabel()}</span>
      )}
    </div>
  );
}
