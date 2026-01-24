import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Map routes to their lazy import functions for prefetching
const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Index'),
  '/products': () => import('@/pages/Products'),
  '/new-arrivals': () => import('@/pages/NewArrivals'),
  '/cart': () => import('@/pages/Cart'),
  '/checkout': () => import('@/pages/Checkout'),
  '/wishlist': () => import('@/pages/Wishlist'),
  '/profile': () => import('@/pages/Profile'),
  '/auth': () => import('@/pages/Auth'),
  '/sale': () => import('@/pages/Sale'),
  '/search': () => import('@/pages/Search'),
};

// Preload routes that users are likely to visit next
const routePreloadMap: Record<string, string[]> = {
  '/': ['/products', '/new-arrivals', '/sale'],
  '/products': ['/cart', '/wishlist'],
  '/new-arrivals': ['/products', '/cart'],
  '/sale': ['/products', '/cart'],
  '/cart': ['/checkout', '/auth'],
  '/auth': ['/products', '/profile'],
  '/checkout': ['/auth'],
  '/search': ['/products'],
};

// Track preloaded routes to avoid duplicate requests
const preloadedRoutes = new Set<string>();

export const useRoutePreload = () => {
  const location = useLocation();

  const preloadRoute = useCallback((route: string) => {
    if (preloadedRoutes.has(route)) return;
    
    const importFn = routeImports[route];
    if (importFn) {
      preloadedRoutes.add(route);
      // Use requestIdleCallback for non-blocking preload
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => importFn(), { timeout: 3000 });
      } else {
        setTimeout(() => importFn(), 100);
      }
    }
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    const routesToPreload = routePreloadMap[currentPath] || [];

    // Preload after initial render is complete
    const timer = setTimeout(() => {
      routesToPreload.forEach(preloadRoute);
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname, preloadRoute]);

  // Also preload on link hover
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/') && routeImports[href]) {
          preloadRoute(href);
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, [preloadRoute]);
};
