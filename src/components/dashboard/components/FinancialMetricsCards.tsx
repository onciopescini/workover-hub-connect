
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Target 
} from 'lucide-react';
import { FinancialMetricsProps } from '../types/financial-metrics-types';

export const FinancialMetricsCards: React.FC<FinancialMetricsProps> = ({
  monthlyRevenue,
  revenueGrowth,
  averageBookingValue,
  occupancyRate
}) => {
  const getGrowthIcon = () => {
    if (revenueGrowth > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (revenueGrowth < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getGrowthColor = () => {
    if (revenueGrowth > 0) return 'text-green-600';
    if (revenueGrowth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Questo Mese
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-900">€{monthlyRevenue.toFixed(2)}</div>
          <div className="flex items-center gap-1 mt-1">
            {getGrowthIcon()}
            <span className={`text-sm font-medium ${getGrowthColor()}`}>
              {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </span>
            <span className="text-sm text-blue-700">vs mese scorso</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-green-600" />
            <Badge variant="secondary">Media</Badge>
          </div>
          <div className="text-2xl font-bold">€{averageBookingValue.toFixed(2)}</div>
          <div className="text-sm text-gray-600 mt-1">Per prenotazione</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-purple-600" />
            <Badge variant="secondary">Occupazione</Badge>
          </div>
          <div className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600 mt-1">Tasso mensile</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <Badge variant="secondary">Obiettivo</Badge>
          </div>
          <div className="text-2xl font-bold">€5.000</div>
          <div className="text-sm text-gray-600 mt-1">
            {((monthlyRevenue / 5000) * 100).toFixed(0)}% raggiunto
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
