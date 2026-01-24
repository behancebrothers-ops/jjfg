import { Suspense, lazy, ComponentType, useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Generic loading fallback
export const DefaultLoader = () => (
  <div className="w-full h-64 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Card skeleton loader
export const CardLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-48 w-full rounded-lg" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

// Grid skeleton loader
export const GridLoader = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <CardLoader key={i} />
    ))}
  </div>
);

// Section skeleton loader
export const SectionLoader = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-48" />
    <GridLoader count={3} />
  </div>
);

// Preload a lazy component (for route prefetching)
export const preloadComponent = (
  importFn: () => Promise<{ default: ComponentType<any> }>
) => {
  importFn();
};

// Intersection-based lazy loading component
interface ViewportLazyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export const ViewportLazy = ({
  children,
  fallback = <DefaultLoader />,
  rootMargin = "200px",
  threshold = 0,
}: ViewportLazyProps) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isInView ? children : fallback}
    </div>
  );
};

// Hook for lazy loading on scroll
export function useLazyLoad(options?: IntersectionObserverInit) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px",
        ...options,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}
