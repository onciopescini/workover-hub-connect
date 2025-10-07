import React from 'react';
import { cn } from '@/lib/utils';

interface SlotProgressBarProps {
  available: number;
  total: number;
  time: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export const SlotProgressBar: React.FC<SlotProgressBarProps> = ({
  available,
  total,
  time,
  onClick,
  isSelected = false,
}) => {
  const percentage = total > 0 ? (available / total) * 100 : 0;
  
  // Color coding based on availability
  const getColorClass = () => {
    if (available === 0) return 'bg-destructive';
    if (percentage > 60) return 'bg-success';
    if (percentage > 30) return 'bg-warning';
    return 'bg-destructive';
  };

  const isAvailable = available > 0;

  return (
    <button
      onClick={onClick}
      disabled={!isAvailable}
      className={cn(
        "w-full text-left p-2 rounded-md transition-all",
        isAvailable ? "hover:bg-accent cursor-pointer" : "cursor-not-allowed opacity-60",
        isSelected && "bg-accent ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{time}</span>
        <span className={cn(
          "text-xs font-semibold",
          isAvailable ? "text-foreground" : "text-muted-foreground"
        )}>
          {available}/{total}
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300",
            getColorClass()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!isAvailable && (
        <span className="text-[10px] text-muted-foreground mt-1 block">
          Non disponibile
        </span>
      )}
    </button>
  );
};