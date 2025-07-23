import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface RateLimitedButtonProps {
  isRateLimited: boolean;
  remainingTime: number;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  type?: "button" | "submit" | "reset";
}

export const RateLimitedButton: React.FC<RateLimitedButtonProps> = ({
  isRateLimited,
  remainingTime,
  children,
  onClick,
  disabled = false,
  variant = "default",
  size = "default",
  className = "",
  type = "button"
}) => {
  const isDisabled = disabled || isRateLimited;

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
    >
      {isRateLimited ? (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Riprova tra {remainingTime}s</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
};