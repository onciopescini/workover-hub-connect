
import React from 'react';
import { AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AvailabilityFeedbackProps {
  type: 'success' | 'warning' | 'error' | 'loading' | 'offline';
  message: string;
  details?: string;
  className?: string;
  showIcon?: boolean;
}

export const AvailabilityFeedback: React.FC<AvailabilityFeedbackProps> = ({
  type,
  message,
  details,
  className,
  showIcon = true
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'loading':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'loading':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'offline':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all duration-200",
      getStyles(),
      className
    )}>
      <div className="flex items-start gap-2">
        {showIcon && getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{message}</p>
          {details && (
            <p className="text-xs opacity-75 mt-1">{details}</p>
          )}
        </div>
      </div>
    </div>
  );
};
