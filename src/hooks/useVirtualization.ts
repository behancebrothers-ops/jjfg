import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface VirtualizationOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

interface VirtualizedItem<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
}

export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions
) {
  const { itemHeight, overscan = 3, containerHeight = 800 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const { startIndex, endIndex, visibleItems, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount);

    const visibleItems: VirtualizedItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        item: items[i],
        index: i,
        style: {
          position: "absolute",
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }

    return { startIndex, endIndex, visibleItems, totalHeight };
  }, [items, itemHeight, overscan, containerHeight, scrollTop]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    containerStyle: {
      height: containerHeight,
      overflow: "auto",
      position: "relative" as const,
    },
    innerStyle: {
      height: totalHeight,
      position: "relative" as const,
    },
  };
}

// Grid virtualization for product grids
interface GridVirtualizationOptions {
  itemHeight: number;
  columns: number;
  overscan?: number;
  gap?: number;
}

export function useGridVirtualization<T>(
  items: T[],
  options: GridVirtualizationOptions
) {
  const { itemHeight, columns, overscan = 2, gap = 24 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(window.innerHeight);
      }
    };
    
    updateHeight();
    window.addEventListener("resize", updateHeight, { passive: true });
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Calculate visible range
  const { visibleItems, totalHeight, rowCount } = useMemo(() => {
    const rowCount = Math.ceil(items.length / columns);
    const rowHeight = itemHeight + gap;
    const totalHeight = rowCount * rowHeight;
    
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(containerHeight / rowHeight) + overscan * 2;
    const endRow = Math.min(rowCount - 1, startRow + visibleRowCount);

    const visibleItems: VirtualizedItem<T>[] = [];
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index < items.length) {
          visibleItems.push({
            item: items[index],
            index,
            style: {
              position: "absolute",
              top: row * rowHeight,
              left: `calc(${(col / columns) * 100}% + ${gap / 2}px)`,
              width: `calc(${100 / columns}% - ${gap}px)`,
              height: itemHeight,
            },
          });
        }
      }
    }

    return { visibleItems, totalHeight, rowCount };
  }, [items, itemHeight, columns, gap, overscan, containerHeight, scrollTop]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    rowCount,
    containerStyle: {
      height: "100%",
      overflow: "auto",
      position: "relative" as const,
    },
    innerStyle: {
      height: totalHeight,
      position: "relative" as const,
    },
  };
}
