
import React from 'react';
import { OptimizedImage } from './OptimizedImage';
import { generateSrcSet, generateSizes, DEFAULT_BREAKPOINTS } from '@/lib/image-processing-utils';
import type { ResponsiveBreakpoint } from '@/lib/image-processing-utils';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  breakpoints?: ResponsiveBreakpoint[];
  sizes?: { maxWidth: string; size: string }[];
  aspectRatio?: 'square' | 'video' | 'photo' | 'wide' | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  priority?: boolean;
  enableWebP?: boolean;
  fallbackSrc?: string;
  onLoadComplete?: () => void;
}

const ASPECT_RATIOS = {
  square: '1 / 1',
  video: '16 / 9',
  photo: '4 / 3',
  wide: '21 / 9'
};

export function ResponsiveImage({
  src,
  alt,
  breakpoints = DEFAULT_BREAKPOINTS,
  sizes,
  aspectRatio,
  objectFit = 'cover',
  priority = false,
  enableWebP = true,
  fallbackSrc,
  className,
  onLoadComplete,
  onLoad,
  onError,
  onLoadStart,
  ...props
}: ResponsiveImageProps) {
  // Generate responsive attributes
  const srcSet = generateSrcSet(src, breakpoints);
  const sizesAttribute = sizes ? generateSizes(sizes) : generateSizes();

  // Resolve aspect ratio
  const resolvedAspectRatio = aspectRatio && aspectRatio in ASPECT_RATIOS 
    ? ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS]
    : aspectRatio;

  const containerStyle: React.CSSProperties = {
    aspectRatio: resolvedAspectRatio || undefined
  };

  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={containerStyle}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        srcSet={srcSet}
        sizes={sizesAttribute}
        priority={priority}
        enableWebP={enableWebP}
        enableResponsive={false} // We're handling it manually here
        fallbackSrc={fallbackSrc ?? '/images/placeholder.png'}
        onLoadComplete={onLoadComplete ?? (() => {})}
        onLoad={onLoad}
        onError={onError}
        onLoadStart={onLoadStart}
        className={cn(
          'w-full h-full',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'scale-down' && 'object-scale-down',
          objectFit === 'none' && 'object-none'
        )}
        {...props}
      />
    </div>
  );
}
