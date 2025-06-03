
import React, { useState, useCallback } from 'react';
import { generateImageUrls, isWebPSupported } from '@/lib/webp-conversion-utils';
import { generateSrcSet, generateSizes } from '@/lib/image-processing-utils';
import { createContextualLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const imageLogger = createContextualLogger('OptimizedImage');

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  enableWebP?: boolean;
  enableResponsive?: boolean;
  priority?: boolean;
  quality?: number;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onError?: (error: string) => void;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  enableWebP = true,
  enableResponsive = true,
  priority = false,
  quality = 0.85,
  className,
  onLoadStart,
  onLoadComplete,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
    
    imageLogger.debug('Image load started', {
      action: 'load_start',
      src,
      alt
    });
  }, [src, alt, onLoadStart]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoadComplete?.();
    
    imageLogger.debug('Image loaded successfully', {
      action: 'load_success',
      src: currentSrc,
      alt
    });
  }, [currentSrc, alt, onLoadComplete]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    
    imageLogger.warn('Image load failed', {
      action: 'load_error',
      src: currentSrc,
      alt,
      hasFallback: !!fallbackSrc
    });

    // Try fallback if available and not already used
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      imageLogger.info('Attempting fallback image', {
        action: 'fallback_attempt',
        originalSrc: currentSrc,
        fallbackSrc
      });
      
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
      return;
    }

    onError?.('Image failed to load');
  }, [currentSrc, alt, fallbackSrc, onError]);

  // Generate optimized URLs
  const generateOptimizedSrc = useCallback(() => {
    if (!src) return '';

    const webpSupported = enableWebP && isWebPSupported();
    const urls = generateImageUrls(src, webpSupported);
    
    imageLogger.debug('Generated optimized URLs', {
      action: 'urls_generated',
      originalSrc: src,
      webpSupported,
      optimizedUrl: urls.primary
    });

    return urls.primary;
  }, [src, enableWebP]);

  // Set initial src
  React.useEffect(() => {
    const optimizedSrc = generateOptimizedSrc();
    setCurrentSrc(optimizedSrc);
    handleLoadStart();
  }, [generateOptimizedSrc, handleLoadStart]);

  // Generate srcSet for responsive images
  const srcSet = enableResponsive && currentSrc ? generateSrcSet(currentSrc) : undefined;
  const sizes = enableResponsive ? generateSizes() : undefined;

  return (
    <img
      src={currentSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      onLoadStart={handleLoadStart}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        'transition-opacity duration-300',
        isLoading && 'opacity-0',
        !isLoading && !hasError && 'opacity-100',
        hasError && 'opacity-50',
        className
      )}
      {...props}
    />
  );
}
