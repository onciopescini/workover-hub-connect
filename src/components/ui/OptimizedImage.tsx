
import React, { useState, useCallback, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  enableWebP?: boolean;
  enableResponsive?: boolean;
  priority?: boolean;
  fallbackSrc?: string;
  quality?: number;
  onLoadComplete?: () => void;
  aspectRatio?: string;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt = '',
    className,
    enableWebP = true,
    enableResponsive = false,
    priority = false,
    fallbackSrc,
    quality = 0.8,
    onLoadComplete,
    onLoad,
    onError,
    aspectRatio,
    style,
    width,
    height,
    ...props
  }, ref) => {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);
      setHasError(false);
      onLoadComplete?.();
      onLoad?.(event);
    }, [onLoad, onLoadComplete]);

    const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);
      setHasError(true);
      
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setHasError(false);
        setIsLoading(true);
      }
      
      onError?.(event);
    }, [onError, fallbackSrc, currentSrc]);

    // Don't render if no src
    if (!currentSrc) {
      return null;
    }

    // Ensure dimensions are set to prevent CLS
    const imageStyle = {
      ...style,
      ...(aspectRatio && { aspectRatio }),
    };

    return (
      <img
        ref={ref}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        style={imageStyle}
        className={cn(
          'transition-opacity duration-300',
          isLoading && 'opacity-0',
          !isLoading && !hasError && 'opacity-100',
          hasError && 'opacity-50',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...props}
      />
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';
