import { useEffect, useState } from 'react';
import { isSlowConnection, isLowEndDevice } from '@/utils/performance';

interface PerformanceSettings {
  shouldReduceAnimations: boolean;
  shouldReduceQuality: boolean;
  shouldLazyLoadImages: boolean;
  shouldPrefetchRoutes: boolean;
  imageQuality: number;
}

/**
 * Hook per adattare le performance in base al device e alla connessione
 */
export function usePerformanceOptimization(): PerformanceSettings {
  const [settings, setSettings] = useState<PerformanceSettings>({
    shouldReduceAnimations: false,
    shouldReduceQuality: false,
    shouldLazyLoadImages: true,
    shouldPrefetchRoutes: true,
    imageQuality: 80,
  });

  useEffect(() => {
    const slowConnection = isSlowConnection();
    const lowEndDevice = isLowEndDevice();

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setSettings({
      shouldReduceAnimations: prefersReducedMotion || lowEndDevice,
      shouldReduceQuality: slowConnection || lowEndDevice,
      shouldLazyLoadImages: true,
      shouldPrefetchRoutes: !slowConnection && !lowEndDevice,
      imageQuality: slowConnection ? 60 : lowEndDevice ? 70 : 80,
    });
  }, []);

  return settings;
}
