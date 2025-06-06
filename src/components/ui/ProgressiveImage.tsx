
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { cn } from '@/lib/utils';
import { createContextualLogger } from '@/lib/logger';

const progressiveLogger = createContextualLogger('ProgressiveImage');

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  blurDataUrl?: string;
  lowQualitySrc?: string;
  priority?: boolean;
  enableWebP?: boolean;
  enableResponsive?: boolean;
  aspectRatio?: string;
  onLoadComplete?: () => void;
}

export function ProgressiveImage({
  src,
  alt,
  blurDataUrl,
  lowQualitySrc,
  priority = false,
  enableWebP = true,
  enableResponsive = true,
  aspectRatio,
  className,
  onLoadComplete,
  onLoad,
  onError,
  onLoadStart,
  ...props
}: ProgressiveImageProps) {
  const [isInView, setIsInView] = useState(priority);
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            
            progressiveLogger.debug('Image entered viewport', {
              action: 'viewport_enter',
              src,
              alt
            });
            
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, isInView, src, alt]);

  const handleLowQualityLoad = useCallback(() => {
    setLowQualityLoaded(true);
    
    progressiveLogger.debug('Low quality image loaded', {
      action: 'low_quality_loaded',
      src: lowQualitySrc || blurDataUrl,
      alt
    });
  }, [lowQualitySrc, blurDataUrl, alt]);

  const handleHighQualityLoad = useCallback(() => {
    setHighQualityLoaded(true);
    onLoadComplete?.();
    
    progressiveLogger.debug('High quality image loaded', {
      action: 'high_quality_loaded',
      src,
      alt
    });
  }, [src, alt, onLoadComplete]);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError?.(event);
    
    progressiveLogger.error('Progressive image load failed', {
      action: 'progressive_load_error',
      src,
      alt
    }, new Error('Image failed to load'));
  }, [src, alt, onError]);

  // Calculate container style with aspect ratio
  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio || 'auto',
    background: blurDataUrl ? `url(${blurDataUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        'bg-gray-100', // Fallback background
        className
      )}
      style={containerStyle}
    >
      {/* Blur placeholder background */}
      {blurDataUrl && !lowQualityLoaded && !highQualityLoaded && (
        <div
          className="absolute inset-0 scale-110 filter blur-md"
          style={{
            backgroundImage: `url(${blurDataUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Low quality image (if provided) */}
      {lowQualitySrc && isInView && !highQualityLoaded && (
        <OptimizedImage
          src={lowQualitySrc}
          alt={alt}
          priority={priority}
          enableWebP={false} // Usually already optimized
          enableResponsive={false}
          onLoadComplete={handleLowQualityLoad}
          onError={handleImageError}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            'transition-opacity duration-300',
            lowQualityLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* High quality image */}
      {isInView && (
        <OptimizedImage
          src={src}
          alt={alt}
          priority={priority}
          enableWebP={enableWebP}
          enableResponsive={enableResponsive}
          onLoadComplete={handleHighQualityLoad}
          onLoad={onLoad}
          onError={handleImageError}
          onLoadStart={onLoadStart}
          className={cn(
            'w-full h-full object-cover',
            'transition-opacity duration-500',
            highQualityLoaded ? 'opacity-100' : 'opacity-0',
            !highQualityLoaded && (lowQualityLoaded || blurDataUrl) && 'absolute inset-0'
          )}
          {...props}
        />
      )}

      {/* Loading state overlay */}
      {!highQualityLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <div className="animate-pulse h-4 w-4 bg-gray-300 rounded-full" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <span className="text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}
