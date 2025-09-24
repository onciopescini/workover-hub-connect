import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";

interface StripeStatusPillProps {
  isConnected: boolean;
  onboardingStatus?: 'none' | 'pending' | 'completed' | 'restricted';
  size?: 'sm' | 'md';
}

export const StripeStatusPill: React.FC<StripeStatusPillProps> = ({ 
  isConnected, 
  onboardingStatus = 'none',
  size = 'md'
}) => {
  const getStatusConfig = () => {
    if (isConnected && onboardingStatus === 'completed') {
      return {
        label: 'Collegato',
        variant: 'default' as const,
        icon: <CheckCircle className="w-3 h-3" />,
        color: 'text-green-600'
      };
    }

    if (onboardingStatus === 'pending') {
      return {
        label: 'In verifica',
        variant: 'secondary' as const,
        icon: <Clock className="w-3 h-3" />,
        color: 'text-yellow-600'
      };
    }

    if (onboardingStatus === 'restricted') {
      return {
        label: 'Limitato',
        variant: 'destructive' as const,
        icon: <XCircle className="w-3 h-3" />,
        color: 'text-red-600'
      };
    }

    return {
      label: 'Non collegato',
      variant: 'outline' as const,
      icon: <AlertCircle className="w-3 h-3" />,
      color: 'text-gray-600'
    };
  };

  const config = getStatusConfig();
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm';

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 font-medium">Pagamenti:</span>
      <Badge variant={config.variant} className={`flex items-center gap-1 ${sizeClasses}`}>
        <span className={config.color}>{config.icon}</span>
        {config.label}
      </Badge>
    </div>
  );
};