
import React from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  variant?: 'spinner' | 'skeleton' | 'overlay';
  message?: string;
  progress?: number;
  className?: string;
  context?: string;
  children?: React.ReactNode;
  skeletonConfig?: {
    rows?: number;
    showAvatar?: boolean;
    showImage?: boolean;
    variant?: 'card' | 'list' | 'profile' | 'text';
  };
}

export function LoadingOverlay({
  isLoading,
  variant = 'spinner',
  message = 'Caricamento...',
  progress,
  className,
  context = 'overlay',
  children,
  skeletonConfig = {}
}: LoadingOverlayProps) {
  if (!isLoading && children) {
    return <>{children}</>;
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn('animate-pulse', className)}>
        <SkeletonLoader
          variant={skeletonConfig.variant || 'card'}
          rows={skeletonConfig.rows || 3}
          showAvatar={skeletonConfig.showAvatar}
          showImage={skeletonConfig.showImage}
        />
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        {children}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <LoadingSpinner
              text={message}
              showText
              progress={progress}
              context={context}
              enableLogging
            />
          </div>
        )}
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <LoadingSpinner
        text={message}
        showText
        progress={progress}
        context={context}
        enableLogging
      />
    </div>
  );
}
