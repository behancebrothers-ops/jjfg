import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import { isImagePreloaded } from "@/hooks/useImagePreload";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  sizes?: string;
  blurPlaceholder?: boolean;
  aspectRatio?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Generate a tiny blur placeholder
const generateBlurPlaceholder = (width = 10, height = 10) => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb' filter='url(%23b)'/%3E%3C/svg%3E`;
};

// Fallback image
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23e5e7eb' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

export const OptimizedImage = memo(({ 
  src, 
  alt, 
  className, 
  priority = false,
  objectFit = "cover",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  blurPlaceholder = true,
  aspectRatio,
  onLoad,
  onError
}: OptimizedImageProps) => {
  // Check if already preloaded
  const alreadyLoaded = isImagePreloaded(src);
  const [isLoaded, setIsLoaded] = useState(alreadyLoaded);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority || alreadyLoaded);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || alreadyLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: "100px",
        threshold: 0
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, alreadyLoaded]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  };

  // Determine image source
  const imageSrc = hasError ? FALLBACK_IMAGE : src;
  const blurDataURL = blurPlaceholder ? generateBlurPlaceholder() : undefined;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        className
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Blur placeholder */}
      {blurPlaceholder && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl"
        />
      )}
      
      {/* Loading skeleton */}
      {!isLoaded && !blurPlaceholder && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            `object-${objectFit}`,
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...(priority && { fetchPriority: "high" as const })}
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

// Progressive image component with multiple sources
interface ProgressiveImageProps extends OptimizedImageProps {
  lowQualitySrc?: string;
  highQualitySrc?: string;
}

export const ProgressiveImage = memo(({
  src,
  lowQualitySrc,
  highQualitySrc,
  alt,
  className,
  priority = false,
  objectFit = "cover",
  onLoad,
}: ProgressiveImageProps) => {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src);
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load high quality image when in view
  useEffect(() => {
    if (!isInView || !highQualitySrc) return;

    const img = new Image();
    img.onload = () => {
      setCurrentSrc(highQualitySrc);
      setIsHighQualityLoaded(true);
      onLoad?.();
    };
    img.src = highQualitySrc;
  }, [isInView, highQualitySrc, onLoad]);

  // Intersection Observer
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden bg-muted", className)}
    >
      <img
        src={currentSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn(
          "w-full h-full transition-all duration-700",
          `object-${objectFit}`,
          !isHighQualityLoaded && lowQualitySrc ? "blur-sm scale-105" : ""
        )}
      />
    </div>
  );
});

ProgressiveImage.displayName = "ProgressiveImage";
