
import React, { useState, useCallback, useEffect } from 'react';
import { generateImageUrls, isWebPSupported } from '@/lib/webp-conversion-utils';
import { generateSrcSet, generateSizes } from '@/lib/image-processing-utils';
import { createContextualLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const imageLogger = createContextualLogger('OptimizedImage');

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src?: string;
  alt?: string;
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
    alt = '',
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
    
    // Validate and determine final src
    const isValidSrc = (url: string | undefined): boolean => {
      if (!url || url.trim() === '') return false;
      try {
        // Check if it's a valid URL or relative path
        return url.startsWith('/') || url.startsWith('http') || url.startsWith('data:');
      } catch {
        return false;
      }
    };

    const determineFinalSrc = useCallback(() => {
      if (isValidSrc(src)) return src!;
      if (isValidSrc(fallbackSrc)) return fallbackSrc!;
      return DEFAULT_PLACEHOLDER;
    }, [src, fallbackSrc]);

    const finalSrc = determineFinalSrc();

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
      if (fallbackSrc && currentSrc !== fallbackSrc && isValidSrc(fallbackSrc)) {
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
      if (currentSrc !== DEFAULT_PLACEHOLDER) {
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

    // Generate optimized URLs only for valid sources
    const generateOptimizedSrc = useCallback(() => {
      if (!isValidSrc(finalSrc)) {
        return DEFAULT_PLACEHOLDER;
      }

      // Don't optimize placeholder or data URLs
      if (finalSrc === DEFAULT_PLACEHOLDER || finalSrc.startsWith('data:')) {
        return finalSrc;
      }

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

    // Set initial src when component mounts or finalSrc changes
    useEffect(() => {
      const optimizedSrc = generateOptimizedSrc();
      setCurrentSrc(optimizedSrc);
      setHasError(false);
      setIsLoading(true);
    }, [generateOptimizedSrc]);

    // Early return for completely invalid sources
    if (!currentSrc) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-gray-100 text-gray-400',
            className
          )}
          {...props}
        >
          <span className="text-sm">No image available</span>
        </div>
      );
    }

    // Generate srcSet for responsive images (only for valid, non-placeholder images)
    const srcSet = enableResponsive && 
                   currentSrc !== DEFAULT_PLACEHOLDER && 
                   !currentSrc.startsWith('data:') 
                   ? generateSrcSet(currentSrc) 
                   : undefined;
    
    const sizes = enableResponsive && srcSet ? generateSizes() : undefined;

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
