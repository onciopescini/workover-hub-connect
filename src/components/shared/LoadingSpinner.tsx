
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createContextualLogger } from '@/lib/logger';
import { useEffect } from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  showText?: boolean;
  variant?: 'default' | 'inline' | 'overlay' | 'centered';
  progress?: number;
  context?: string;
  enableLogging?: boolean;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

const logger = createContextualLogger('LoadingSpinner');

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text,
  showText = !!text,
  variant = 'default',
  progress,
  context = 'general',
  enableLogging = false
}: LoadingSpinnerProps) {
  useEffect(() => {
    if (enableLogging) {
      logger.debug('Loading spinner mounted', {
        action: 'spinner_mount',
        context,
        variant,
        size,
        hasProgress: !!progress
      });
    }

    return () => {
      if (enableLogging) {
        logger.debug('Loading spinner unmounted', {
          action: 'spinner_unmount',
          context
        });
      }
    };
  }, [enableLogging, context, variant, size, progress]);

  const spinnerContent = (
    <>
      <div className="relative">
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {progress !== undefined && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-current"
            style={{
              transform: `rotate(${(progress / 100) * 360}deg)`,
              transition: 'transform 0.3s ease-out'
            }}
          />
        )}
      </div>
      {showText && text && (
        <span className={cn("text-gray-600", textSizes[size])}>
          {text}
          {progress !== undefined && ` (${Math.round(progress)}%)`}
        </span>
      )}
    </>
  );

  if (variant === 'overlay') {
    return (
      <div className={cn(
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
        "backdrop-blur-sm",
        className
      )}>
        <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
          {spinnerContent}
        </div>
      </div>
    );
  }

  if (variant === 'centered') {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-[200px] gap-3",
        className
      )}>
        {spinnerContent}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        {spinnerContent}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      {spinnerContent}
    </div>
  );
}
