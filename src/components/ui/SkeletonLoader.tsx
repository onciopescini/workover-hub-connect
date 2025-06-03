
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'profile' | 'image' | 'text' | 'custom';
  rows?: number;
  className?: string;
  showAvatar?: boolean;
  showImage?: boolean;
  animated?: boolean;
}

export function SkeletonLoader({ 
  variant = 'card', 
  rows = 3, 
  className,
  showAvatar = false,
  showImage = false,
  animated = true
}: SkeletonLoaderProps) {
  const baseClasses = cn(
    "space-y-3",
    animated && "animate-pulse",
    className
  );

  if (variant === 'card') {
    return (
      <div className={cn("p-6 border rounded-lg", baseClasses)}>
        {showImage && (
          <Skeleton className="h-48 w-full rounded-md mb-4" />
        )}
        {showAvatar && (
          <div className="flex items-center space-x-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        )}
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-4",
              i === 0 && "w-3/4",
              i === rows - 1 && "w-1/2",
              i !== 0 && i !== rows - 1 && "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={baseClasses}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border rounded-md">
            {showAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className={cn("text-center", baseClasses)}>
        <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
        <Skeleton className="h-6 w-32 mx-auto mb-2" />
        <Skeleton className="h-4 w-24 mx-auto mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full mb-2" />
        ))}
      </div>
    );
  }

  if (variant === 'image') {
    return (
      <Skeleton className={cn("aspect-video w-full rounded-md", className)} />
    );
  }

  if (variant === 'text') {
    return (
      <div className={baseClasses}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              "h-4",
              i % 3 === 0 && "w-3/4",
              i % 3 === 1 && "w-full",
              i % 3 === 2 && "w-2/3"
            )}
          />
        ))}
      </div>
    );
  }

  // Custom variant - just basic skeletons
  return (
    <div className={baseClasses}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
