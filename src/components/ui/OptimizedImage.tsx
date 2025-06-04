
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
    
    // Enhanced validation for src with early falsy detection
    const isValidSrc = (url: string | undefined | null): boolean => {
      // Early return for clearly invalid values
      if (!url || typeof url !== 'string') {
        return false;
      }
      
      const trimmedUrl = url.trim();
      
      // Early return for empty or invalid string patterns
      if (trimmedUrl === '' || trimmedUrl === 'undefined' || trimmedUrl === 'null') {
        return false;
      }
      
      try {
        // Check if it's a valid URL or relative path
        return trimmedUrl.startsWith('/') || 
               trimmedUrl.startsWith('http') || 
               trimmedUrl.startsWith('https') || 
               trimmedUrl.startsWith('data:') ||
               trimmedUrl.startsWith('blob:');
      } catch {
        return false;
      }
    };

    const determineFinalSrc = useCallback(() => {
      // Early return for falsy src values to prevent any processing
      if (!src || src === '' || src === 'undefined' || src === 'null') {
        imageLogger.debug('Src is falsy, using placeholder immediately', {
          action: 'falsy_src_detected',
          src,
          fallbackSrc
        });
        return DEFAULT_PLACEHOLDER;
      }
      
      // Priority: src -> fallbackSrc -> default placeholder
      if (isValidSrc(src)) {
        return src.trim();
      }
      if (isValidSrc(fallbackSrc)) {
        return fallbackSrc!.trim();
      }
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
        alt,
        isValidSrc: isValidSrc(src)
      });
    }, [finalSrc, alt, src, onLoadStart]);

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
        originalSrc: src,
        hasFallback: !!fallbackSrc,
        isValidOriginalSrc: isValidSrc(src)
      });

      // Try fallback if available and not already used and different from current
      if (fallbackSrc && currentSrc !== fallbackSrc && isValidSrc(fallbackSrc) && fallbackSrc !== src) {
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

      // If even placeholder fails, show error
      onError?.(event);
      onErrorCustom?.('Image failed to load');
    }, [currentSrc, alt, src, fallbackSrc, onError, onErrorCustom]);

    // Generate optimized URLs only for valid sources
    const generateOptimizedSrc = useCallback(() => {
      const srcToUse = finalSrc;
      
      // Early return for placeholder or invalid sources
      if (!isValidSrc(srcToUse) || srcToUse === DEFAULT_PLACEHOLDER) {
        return srcToUse;
      }

      // Don't optimize data URLs or blob URLs
      if (srcToUse.startsWith('data:') || srcToUse.startsWith('blob:')) {
        return srcToUse;
      }

      try {
        const webpSupported = enableWebP && isWebPSupported();
        const urls = generateImageUrls(srcToUse, webpSupported);
        
        imageLogger.debug('Generated optimized URLs', {
          action: 'urls_generated',
          originalSrc: srcToUse,
          webpSupported,
          optimizedUrl: urls.primary
        });

        return urls.primary;
      } catch (error) {
        imageLogger.warn('Failed to generate optimized URL, using original', {
          action: 'optimization_failed',
          src: srcToUse,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return srcToUse;
      }
    }, [finalSrc, enableWebP]);

    // Set initial src when component mounts or finalSrc changes - with falsy protection
    useEffect(() => {
      // Prevent setting empty or invalid src
      if (!finalSrc || finalSrc === '' || finalSrc === 'undefined' || finalSrc === 'null') {
        setCurrentSrc(DEFAULT_PLACEHOLDER);
        setHasError(false);
        setIsLoading(true);
        return;
      }
      
      const optimizedSrc = generateOptimizedSrc();
      setCurrentSrc(optimizedSrc);
      setHasError(false);
      setIsLoading(true);
    }, [generateOptimizedSrc, finalSrc]);

    // Early return for completely invalid sources that can't be recovered
    if (!currentSrc || currentSrc === '' || currentSrc === 'undefined' || currentSrc === 'null') {
      imageLogger.warn('No valid src available, showing fallback UI', {
        action: 'no_src_fallback',
        providedSrc: src,
        fallbackSrc,
        currentSrc,
        alt
      });
      
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
                   !currentSrc.startsWith('data:') &&
                   !currentSrc.startsWith('blob:')
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
