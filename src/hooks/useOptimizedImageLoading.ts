import { useState, useEffect } from 'react';
import { isSlowConnection } from '@/utils/performance';

interface OptimizedImageConfig {
  baseUrl: string;
  width?: number;
  quality?: number;
}

interface OptimizedImageResult {
  src: string;
  shouldLazyLoad: boolean;
  quality: number;
}

/**
 * Hook for optimizing image loading based on viewport size and connection speed
 */
export function useOptimizedImageLoading({
  baseUrl,
  width = 600,
  quality = 80,
}: OptimizedImageConfig): OptimizedImageResult {
  const [optimizedWidth, setOptimizedWidth] = useState(width);
  const [optimizedQuality, setOptimizedQuality] = useState(quality);
  const [shouldLazyLoad, setShouldLazyLoad] = useState(true);

  useEffect(() => {
    // Detect viewport size
    const viewportWidth = window.innerWidth;
    
    // Adjust image width based on viewport
    if (viewportWidth < 640) {
      setOptimizedWidth(Math.min(width, 400));
    } else if (viewportWidth < 1024) {
      setOptimizedWidth(Math.min(width, 600));
    } else {
      setOptimizedWidth(width);
    }

    // Adjust quality based on connection speed
    const slowConnection = isSlowConnection();
    if (slowConnection) {
      setOptimizedQuality(60);
      setShouldLazyLoad(true);
    } else {
      setOptimizedQuality(quality);
      setShouldLazyLoad(false);
    }
  }, [width, quality]);

  const src = `${baseUrl}?auto=format&fit=crop&w=${optimizedWidth}&q=${optimizedQuality}`;

  return {
    src,
    shouldLazyLoad,
    quality: optimizedQuality,
  };
}
