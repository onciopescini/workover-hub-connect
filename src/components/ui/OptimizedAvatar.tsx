import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function OptimizedAvatar({ 
  src, 
  alt, 
  fallback, 
  className, 
  size = 'md' 
}: OptimizedAvatarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const initials = fallback || alt.substring(0, 2).toUpperCase();

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {/* Skeleton loader */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />
      )}
      
      {src && !hasError && (
        <AvatarImage
          src={src}
          alt={alt}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          priority={false}
          enableWebP={true}
        />
      )}
      
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
