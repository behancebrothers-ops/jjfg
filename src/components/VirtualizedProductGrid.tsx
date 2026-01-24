import { useRef, useEffect, useState, useMemo, memo, useCallback } from "react";
import { MemoizedProductCard } from "./MemoizedProductCard";
import { ProductGridSkeleton } from "./ProductSkeleton";
import { useImagePreload, queueImagePreload } from "@/hooks/useImagePreload";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
  created_at?: string;
}

interface VirtualizedProductGridProps {
  products: Product[];
  loading?: boolean;
  onAddToCart?: (productId: string) => void;
  itemHeight?: number;
  gap?: number;
}

// Calculate columns based on viewport width
const getColumns = (width: number): number => {
  if (width < 640) return 1;  // sm
  if (width < 1024) return 2; // md
  return 3;                   // lg+
};

export const VirtualizedProductGrid = memo(({
  products,
  loading = false,
  onAddToCart,
  itemHeight = 480,
  gap = 24,
}: VirtualizedProductGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  const [columns, setColumns] = useState(3);
  const overscan = 2;

  // Preload first batch of images immediately
  const firstBatchImages = useMemo(() => {
    return products.slice(0, 6)
      .map(p => p.image_url)
      .filter((url): url is string => !!url);
  }, [products]);

  useImagePreload(firstBatchImages, { priority: "high" });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      setColumns(getColumns(window.innerWidth));
      setContainerHeight(window.innerHeight - 200); // Account for header/footer
    };
    
    updateDimensions();
    window.addEventListener("resize", updateDimensions, { passive: true });
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Scroll handler with throttling
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          setScrollTop(containerRef.current.scrollTop);
        }
      });
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Calculate visible items
  const { visibleItems, totalHeight } = useMemo(() => {
    const rowHeight = itemHeight + gap;
    const rowCount = Math.ceil(products.length / columns);
    const totalHeight = rowCount * rowHeight;
    
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(containerHeight / rowHeight) + overscan * 2;
    const endRow = Math.min(rowCount - 1, startRow + visibleRowCount);

    const visibleItems: Array<{ product: Product; index: number; row: number; col: number }> = [];
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index < products.length) {
          visibleItems.push({
            product: products[index],
            index,
            row,
            col,
          });
        }
      }
    }

    // Preload next batch of images
    const nextRowStart = (endRow + 1) * columns;
    const nextRowEnd = nextRowStart + columns * 2;
    products.slice(nextRowStart, nextRowEnd).forEach(p => {
      if (p.image_url) queueImagePreload(p.image_url);
    });

    return { visibleItems, totalHeight };
  }, [products, columns, itemHeight, gap, scrollTop, containerHeight]);

  if (loading) {
    return <ProductGridSkeleton count={12} />;
  }

  if (products.length === 0) {
    return null;
  }

  const rowHeight = itemHeight + gap;

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight, maxHeight: "80vh" }}
    >
      <div
        className="relative"
        style={{ height: totalHeight }}
      >
        {visibleItems.map(({ product, index, row, col }) => (
          <div
            key={product.id}
            className="absolute transition-transform"
            style={{
              top: row * rowHeight,
              left: `calc(${(col / columns) * 100}%)`,
              width: `calc(${100 / columns}% - ${gap}px)`,
              height: itemHeight,
              paddingRight: col < columns - 1 ? gap : 0,
            }}
          >
            <MemoizedProductCard
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrl={product.image_url}
              category={product.category}
              stock={product.stock}
              priority={index < 6}
              onAddToCart={onAddToCart ? () => onAddToCart(product.id) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedProductGrid.displayName = "VirtualizedProductGrid";

// Standard grid without virtualization (for smaller lists)
export const StandardProductGrid = memo(({
  products,
  loading = false,
  onAddToCart,
}: Omit<VirtualizedProductGridProps, "itemHeight" | "gap">) => {
  // Preload first batch of images
  const firstBatchImages = useMemo(() => {
    return products.slice(0, 6)
      .map(p => p.image_url)
      .filter((url): url is string => !!url);
  }, [products]);

  useImagePreload(firstBatchImages, { priority: "high" });

  if (loading) {
    return <ProductGridSkeleton count={12} />;
  }

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      role="list"
      aria-label="Products"
    >
      {products.map((product, index) => (
        <div key={product.id} role="listitem">
          <MemoizedProductCard
            id={product.id}
            name={product.name}
            price={product.price}
            imageUrl={product.image_url}
            category={product.category}
            stock={product.stock}
            priority={index < 6}
            onAddToCart={onAddToCart ? () => onAddToCart(product.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
});

StandardProductGrid.displayName = "StandardProductGrid";

// Smart grid that automatically switches based on product count
const VIRTUALIZATION_THRESHOLD = 50;

interface SmartProductGridProps extends VirtualizedProductGridProps {
  forceVirtualization?: boolean;
}

export const SmartProductGrid = memo(({
  products,
  loading = false,
  onAddToCart,
  itemHeight = 480,
  gap = 24,
  forceVirtualization = false,
}: SmartProductGridProps) => {
  const shouldVirtualize = forceVirtualization || products.length >= VIRTUALIZATION_THRESHOLD;

  if (shouldVirtualize) {
    return (
      <VirtualizedProductGrid
        products={products}
        loading={loading}
        onAddToCart={onAddToCart}
        itemHeight={itemHeight}
        gap={gap}
      />
    );
  }

  return (
    <StandardProductGrid
      products={products}
      loading={loading}
      onAddToCart={onAddToCart}
    />
  );
});

SmartProductGrid.displayName = "SmartProductGrid";
