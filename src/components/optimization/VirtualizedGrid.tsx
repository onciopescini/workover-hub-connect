import React, { useRef, useCallback } from 'react';
import { FixedSizeGrid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount?: number;
  rowHeight?: number;
  gap?: number;
  className?: string;
  overscanRowCount?: number;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  columnCount = 3,
  rowHeight = 400,
  gap = 24,
  className = '',
  overscanRowCount = 2
}: VirtualizedGridProps<T>) {
  const gridRef = useRef<FixedSizeGrid>(null);
  
  const rowCount = Math.ceil(items.length / columnCount);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    
    if (index >= items.length) {
      return null;
    }

    const item = items[index];
    if (!item) {
      return null;
    }

    return (
      <div
        style={{
          ...style,
          left: Number(style.left) + gap / 2,
          top: Number(style.top) + gap / 2,
          width: Number(style.width) - gap,
          height: Number(style.height) - gap,
        }}
      >
        {renderItem(item, index)}
      </div>
    );
  }, [items, columnCount, gap, renderItem]);

  return (
    <div className={className} style={{ height: '100%', minHeight: '600px' }}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => {
          const columnWidth = width / columnCount;
          
          return (
            <FixedSizeGrid
              ref={gridRef}
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
              overscanRowCount={overscanRowCount}
              className="virtual-grid-scrollbar"
            >
              {Cell}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </div>
  );
}
