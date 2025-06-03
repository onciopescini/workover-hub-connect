
import React, { useState, useCallback } from 'react';
import { generateImageUrls, isWebPSupported } from '@/lib/webp-conversion-utils';
import { generateSrcSet, generateSizes } from '@/lib/image-processing-utils';
import { createContextualLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const imageLogger = createContextualLogger('OptimizedImage');

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  alt: string;
  fallbackSrc?: string;
  enableWebP?: boolean;
  enableResponsive?: boolean;
  priority?: boolean;
  quality?: number;
  onLoadComplete?: () => void;
  onErrorCustom?: (error: string) => void;
}

export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    fallbackSrc,
    enableWebP = true,
    enableResponsive = true,
    priority = false,
    quality = 0.85,
    className,
    onLoadComplete,
    onErrorCustom,
    onLoad,
    onError,
    onLoadStart,
    ...props
  }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState<string>('');

    // Central placeholder configuration
    const DEFAULT_PLACEHOLDER = '/placeholder.svg';
    const finalSrc = src ?? DEFAULT_PLACEHOLDER;

    const handleLoadStart = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setIsLoading(true);
      setHasError(false);
      onLoadStart?.(event);
      
      imageLogger.debug('Image load started', {
        action: 'load_start',
        src: finalSrc,
        alt
      });
    }, [finalSrc, alt, onLoadStart]);

    const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setIsLoading(false);
      onLoad?.(event);
      onLoadComplete?.();
      
      imageLogger.debug('Image loaded successfully', {
        action: 'load_success',
        src: currentSrc,
        alt
      });
    }, [currentSrc, alt, onLoad, onLoadComplete]);

    const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
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

      // Try default placeholder if not already used
      if (currentSrc !== DEFAULT_PLACEHOLDER && !fallbackSrc) {
        imageLogger.info('Attempting default placeholder', {
          action: 'default_placeholder_attempt',
          originalSrc: currentSrc,
          placeholder: DEFAULT_PLACEHOLDER
        });
        
        setCurrentSrc(DEFAULT_PLACEHOLDER);
        setHasError(false);
        setIsLoading(true);
        return;
      }

      onError?.(event);
      onErrorCustom?.('Image failed to load');
    }, [currentSrc, alt, fallbackSrc, onError, onErrorCustom]);

    // Generate optimized URLs
    const generateOptimizedSrc = useCallback(() => {
      if (!finalSrc) return DEFAULT_PLACEHOLDER;

      const webpSupported = enableWebP && isWebPSupported();
      const urls = generateImageUrls(finalSrc, webpSupported);
      
      imageLogger.debug('Generated optimized URLs', {
        action: 'urls_generated',
        originalSrc: finalSrc,
        webpSupported,
        optimizedUrl: urls.primary
      });

      return urls.primary;
    }, [finalSrc, enableWebP]);

    // Set initial src
    React.useEffect(() => {
      const optimizedSrc = generateOptimizedSrc();
      setCurrentSrc(optimizedSrc);
    }, [generateOptimizedSrc]);

    // Generate srcSet for responsive images
    const srcSet = enableResponsive && currentSrc ? generateSrcSet(currentSrc) : undefined;
    const sizes = enableResponsive ? generateSizes() : undefined;

    return (
      <img
        ref={ref}
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
);

OptimizedImage.displayName = 'OptimizedImage';
