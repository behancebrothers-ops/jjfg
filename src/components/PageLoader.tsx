import { memo } from "react";

/**
 * Lightweight, smooth page loading indicator.
 * Uses CSS animations instead of JS for better performance.
 */
export const PageLoader = memo(() => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo/spinner */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-muted animate-pulse" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
});

PageLoader.displayName = "PageLoader";

/**
 * Minimal spinner for small loading states
 */
export const SpinnerLoader = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-primary animate-spin" />
  </div>
));

SpinnerLoader.displayName = "SpinnerLoader";

export default PageLoader;