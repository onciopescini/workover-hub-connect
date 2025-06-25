
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target } from 'lucide-react';
import { PaymentData } from '../types/payment-hub-types';

interface PaymentOverviewTabProps {
  paymentData: PaymentData;
}

export const PaymentOverviewTab: React.FC<PaymentOverviewTabProps> = ({ paymentData }) => {
  return (
    <div className="space-y-6">
      {/* Payout Alert */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  Prossimo Pagamento: €{paymentData.nextPayoutAmount}
                </h3>
                <p className="text-sm text-blue-700">
                  Previsto per {paymentData.nextPayoutDate} • Include 12 transazioni
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-blue-300 text-blue-700">
              Dettagli Payout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Obiettivo Mensile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">€{paymentData.totalRevenue.toLocaleString()} / €15.000</span>
              <span className="text-sm text-gray-600">
                {((paymentData.totalRevenue / 15000) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={(paymentData.totalRevenue / 15000) * 100} className="h-3" />
            <p className="text-sm text-gray-600">
              Rimangono €{(15000 - paymentData.totalRevenue).toLocaleString()} per raggiungere l'obiettivo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
