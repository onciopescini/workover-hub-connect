import React from 'react';
import { cn } from "@/lib/utils";

interface OnlineStatusIndicatorProps {
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OnlineStatusIndicator = ({ 
  isOnline = false, 
  size = 'sm',
  className 
}: OnlineStatusIndicatorProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <span
      className={cn(
        "rounded-full border-2 border-background",
        isOnline ? "bg-green-500" : "bg-muted-foreground",
        sizeClasses[size],
        className
      )}
      aria-label={isOnline ? "Online" : "Offline"}
    />
  );
};
