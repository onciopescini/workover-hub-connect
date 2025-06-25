
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { MonthlyForecast } from '../types/payment-hub-types';

interface PaymentForecastingTabProps {
  monthlyForecast: MonthlyForecast[];
}

export const PaymentForecastingTab: React.FC<PaymentForecastingTabProps> = ({ monthlyForecast }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Previsioni Revenue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {monthlyForecast.map((month) => (
            <div key={month.month} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{month.month}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600">
                    Previsto: €{month.projected.toLocaleString()}
                  </span>
                  {month.actual && (
                    <span className={month.actual >= month.projected ? 'text-green-600' : 'text-red-600'}>
                      Effettivo: €{month.actual.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <Progress 
                value={month.actual ? (month.actual / month.projected) * 100 : 0} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
