import React, { useRef, useCallback } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number | ((index: number) => number);
  className?: string;
  overscanCount?: number;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 100,
  className = '',
  overscanCount = 3
}: VirtualizedListProps<T>) {
  const listRef = useRef<any>(null);
  const isVariableSize = typeof itemHeight === 'function';

  const Row = useCallback(({ index, style }: any) => {
    const item = items[index];
    if (!item) {
      return null;
    }

    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  }, [items, renderItem]);

  return (
    <div className={className} style={{ height: '100%', minHeight: '400px' }}>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => {
          if (isVariableSize && typeof itemHeight === 'function') {
            return (
              <VariableSizeList
                ref={listRef}
                height={height}
                itemCount={items.length}
                itemSize={itemHeight}
                width={width}
                overscanCount={overscanCount}
                className="virtual-list-scrollbar"
              >
                {Row}
              </VariableSizeList>
            );
          }
          
          return (
            <FixedSizeList
              ref={listRef}
              height={height}
              itemCount={items.length}
              itemSize={typeof itemHeight === 'number' ? itemHeight : 100}
              width={width}
              overscanCount={overscanCount}
              className="virtual-list-scrollbar"
            >
              {Row}
            </FixedSizeList>
          );
        }}
      </AutoSizer>
    </div>
  );
}
