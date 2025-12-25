import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  /** Current rating value (0-5) */
  rating: number;
  /** Maximum rating value (default 5) */
  maxRating?: number;
  /** Callback for interactive rating */
  onRatingChange?: (rating: number) => void;
  /** Size of the stars */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Read-only mode */
  readOnly?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom fill color class (default: text-yellow-400 fill-yellow-400) */
  fillColorClass?: string;
  /** Custom empty color class (default: text-gray-300) */
  emptyColorClass?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  onRatingChange,
  size = 'md',
  readOnly = false,
  className,
  fillColorClass = "text-yellow-400 fill-yellow-400",
  emptyColorClass = "text-gray-300"
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = React.useState(0);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-8 h-8'
  };

  const currentSizeClass = sizeClasses[size];
  const isInteractive = !readOnly && !!onRatingChange;

  return (
    <div className={cn("flex items-center space-x-0.5", className)}>
      {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => {
        const isFilled = star <= (hoveredRating || rating);

        return (
          <button
            key={star}
            type="button"
            disabled={!isInteractive}
            onClick={() => isInteractive && onRatingChange?.(star)}
            onMouseEnter={() => isInteractive && setHoveredRating(star)}
            onMouseLeave={() => isInteractive && setHoveredRating(0)}
            className={cn(
              "focus:outline-none transition-colors duration-150",
              !isInteractive && "cursor-default"
            )}
            aria-label={`Rate ${star} stars`}
          >
            <Star
              className={cn(
                currentSizeClass,
                isFilled ? fillColorClass : emptyColorClass
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
