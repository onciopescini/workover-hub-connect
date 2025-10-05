import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchRoute, requestIdleCallback } from '@/utils/performance';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

/**
 * Prefetch intelligente delle route basato sulla navigazione dell'utente
 */
export function RoutePreloader() {
  const location = useLocation();
  const { shouldPrefetchRoutes } = usePerformanceOptimization();

  useEffect(() => {
    if (!shouldPrefetchRoutes) return;

    // Mappa delle route correlate da prefetchare
    const routeMap: Record<string, string[]> = {
      '/': ['/spaces', '/events', '/login'],
      '/spaces': ['/login', '/onboarding'],
      '/login': ['/dashboard', '/onboarding'],
      '/dashboard': ['/bookings', '/messages', '/networking'],
      '/bookings': ['/messages', '/reviews'],
      '/networking': ['/profile', '/messages'],
    };

    const currentPath = location.pathname;
    const relatedRoutes = routeMap[currentPath] || [];

    // Prefetch delle route correlate quando il browser è idle
    requestIdleCallback(() => {
      relatedRoutes.forEach((route) => {
        prefetchRoute(route);
      });
    });
  }, [location.pathname, shouldPrefetchRoutes]);

  return null;
}
