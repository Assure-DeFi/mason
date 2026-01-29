'use client';

import type { ResizableColumnId } from '@/hooks/useColumnResize';

interface ResizeHandleProps {
  columnId: ResizableColumnId;
  onResizeStart: (columnId: ResizableColumnId, event: React.MouseEvent) => void;
  isResizing: boolean;
}

export function ResizeHandle({
  columnId,
  onResizeStart,
  isResizing,
}: ResizeHandleProps) {
  return (
    <div
      className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-10 group/handle"
      onMouseDown={(e) => onResizeStart(columnId, e)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Visual indicator - shows on hover or during resize */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-0.5
          transition-opacity duration-150
          ${
            isResizing
              ? 'bg-gold opacity-100'
              : 'bg-gold/60 opacity-0 group-hover/handle:opacity-100'
          }
        `}
      />
    </div>
  );
}
