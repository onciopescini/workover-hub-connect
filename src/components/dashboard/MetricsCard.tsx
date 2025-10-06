
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number | null;
  changeLabel?: string | null;
  icon?: React.ReactNode;
  description?: string | null;
  variant?: 'default' | 'revenue' | 'bookings' | 'rate';
  compact?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  description,
  variant = 'default',
  compact = false
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'revenue':
        return 'bg-gradient-to-br from-green-50 to-green-100 border-green-200';
      case 'bookings':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200';
      case 'rate':
        return 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200';
    }
  };

  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-gray-600';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Format monetary values with 2 decimals
  const formatValue = () => {
    if (typeof value === 'number') {
      if (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('fatturato')) {
        return `€${value.toFixed(2)}`;
      }
    }
    return value;
  };

  // Format change percentage with 1 decimal
  const formatChange = () => {
    if (change === undefined || change === null) return null;
    const formattedChange = change.toFixed(1);
    return `${change > 0 ? '+' : ''}${formattedChange}%`;
  };

  return (
    <Card className={`${getVariantStyles()} hover:shadow-md transition-shadow ${compact ? 'h-[90px]' : ''}`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${compact ? 'pb-1 p-3' : 'pb-2'}`}>
        <CardTitle className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-700`}>
          {title}
        </CardTitle>
        {icon && <div className="text-gray-600">{icon}</div>}
      </CardHeader>
      <CardContent className={compact ? 'p-3 pt-0' : ''}>
        <div className={`${compact ? 'text-xl' : 'text-2xl'} font-bold mb-1`}>
          {formatValue()}
        </div>
        
        {change !== undefined && change !== null && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {formatChange()}
            </span>
            {changeLabel && (
              <span className="text-xs text-gray-500">
                {changeLabel}
              </span>
            )}
          </div>
        )}
        
        {description && (
          <p className="text-xs text-gray-600 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
