import React, { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SecurityBannerProps {
  message: string;
  type?: 'info' | 'warning' | 'success';
  dismissible?: boolean;
  persistent?: boolean;
}

export const SecurityBanner: React.FC<SecurityBannerProps> = ({
  message,
  type = 'info',
  dismissible = true,
  persistent = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    if (!persistent) {
      const dismissed = localStorage.getItem(`security-banner-dismissed-${btoa(message)}`);
      if (dismissed) {
        setIsVisible(false);
        setHasBeenDismissed(true);
      }
    }
  }, [message, persistent]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    if (!persistent) {
      localStorage.setItem(`security-banner-dismissed-${btoa(message)}`, 'true');
    }
  };

  if (!isVisible || hasBeenDismissed) {
    return null;
  }

  const bgColor = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200', 
    success: 'bg-green-50 border-green-200'
  }[type];

  const textColor = {
    info: 'text-blue-800',
    warning: 'text-amber-800',
    success: 'text-green-800'
  }[type];

  return (
    <div className={`border-t-4 p-4 ${bgColor} ${textColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="p-1 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};