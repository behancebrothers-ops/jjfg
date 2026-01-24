export const AccessibilityNav = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  );
};