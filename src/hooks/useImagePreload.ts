import { useEffect, useRef, useCallback } from "react";

// Image preload cache to prevent duplicate requests
const preloadedImages = new Set<string>();
const preloadQueue: string[] = [];
let isProcessingQueue = false;

// Process queue with concurrency limit
const processQueue = (concurrency = 3) => {
  if (isProcessingQueue || preloadQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  const batch = preloadQueue.splice(0, concurrency);
  let completed = 0;
  
  batch.forEach(src => {
    const img = new Image();
    img.onload = img.onerror = () => {
      preloadedImages.add(src);
      completed++;
      if (completed === batch.length) {
        isProcessingQueue = false;
        processQueue(concurrency);
      }
    };
    img.src = src;
  });
};

// Preload a single image
export const preloadImage = (src: string): Promise<void> => {
  if (preloadedImages.has(src)) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.add(src);
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
};

// Queue images for background preloading
export const queueImagePreload = (src: string) => {
  if (!preloadedImages.has(src) && !preloadQueue.includes(src)) {
    preloadQueue.push(src);
    processQueue();
  }
};

// Preload multiple images with priority
export const preloadImages = async (
  images: string[],
  priority: "high" | "low" = "low"
): Promise<void[]> => {
  if (priority === "high") {
    return Promise.all(images.map(preloadImage));
  } else {
    images.forEach(queueImagePreload);
    return Promise.resolve([]);
  }
};

// Hook for preloading images on component mount
export function useImagePreload(images: string[], options?: {
  priority?: "high" | "low";
  enabled?: boolean;
}) {
  const { priority = "low", enabled = true } = options || {};
  const processedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    const newImages = images.filter(img => !processedRef.current.has(img));
    newImages.forEach(img => processedRef.current.add(img));

    if (newImages.length > 0) {
      preloadImages(newImages, priority);
    }
  }, [images, priority, enabled]);
}

// Hook for preloading next page images
export function useNextPagePreload<T extends { image_url?: string | null }>(
  currentItems: T[],
  allItems: T[],
  currentPage: number,
  pageSize: number
) {
  useEffect(() => {
    // Preload next page images
    const nextPageStart = currentPage * pageSize;
    const nextPageEnd = nextPageStart + pageSize;
    const nextPageItems = allItems.slice(nextPageStart, nextPageEnd);
    
    const nextPageImages = nextPageItems
      .map(item => item.image_url)
      .filter((url): url is string => !!url);
    
    if (nextPageImages.length > 0) {
      // Use low priority for next page
      preloadImages(nextPageImages, "low");
    }
  }, [currentPage, pageSize, allItems]);
}

// Hook for intersection-based preloading
export function useIntersectionPreload(
  images: string[],
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<Element, string>>(new Map());

  const registerElement = useCallback((element: Element | null, src: string) => {
    if (!element || !observerRef.current) return;
    
    elementsRef.current.set(element, src);
    observerRef.current.observe(element);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const src = elementsRef.current.get(entry.target);
          if (src) {
            queueImagePreload(src);
            observerRef.current?.unobserve(entry.target);
            elementsRef.current.delete(entry.target);
          }
        }
      });
    }, {
      rootMargin: "200px",
      ...options,
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [options]);

  return { registerElement };
}

// Check if image is already preloaded
export const isImagePreloaded = (src: string): boolean => {
  return preloadedImages.has(src);
};
