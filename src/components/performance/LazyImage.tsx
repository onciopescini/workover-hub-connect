import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { getOptimizedImageUrl } from '@/utils/performance';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { cn } from '@/lib/utils';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholderClassName?: string;
}

/**
 * Componente immagine ottimizzato con lazy loading e placeholder
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  placeholderClassName,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const { imageQuality, shouldLazyLoadImages } = usePerformanceOptimization();

  useEffect(() => {
    if (!shouldLazyLoadImages) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [shouldLazyLoadImages]);

  const optimizedSrc = getOptimizedImageUrl(src, width, imageQuality);

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse bg-muted',
            placeholderClassName
          )}
        />
      )}
      <img
        ref={imgRef}
        src={isInView ? optimizedSrc : undefined}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
}
