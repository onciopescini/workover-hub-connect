
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Calendar 
} from 'lucide-react';
import { PaymentData } from '../types/payment-hub-types';

interface PaymentStatsHeaderProps {
  paymentData: PaymentData;
}

export const PaymentStatsHeader: React.FC<PaymentStatsHeaderProps> = ({ paymentData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <Badge className="bg-green-100 text-green-800">Revenue</Badge>
          </div>
          <div className="text-2xl font-bold text-green-900">
            €{paymentData.totalRevenue.toLocaleString()}
          </div>
          <div className="text-sm text-green-700 mt-1">Revenue Totale</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <Badge className="bg-yellow-100 text-yellow-800">
              {paymentData.pendingPayments}
            </Badge>
          </div>
          <div className="text-2xl font-bold">In Attesa</div>
          <div className="text-sm text-gray-600 mt-1">Pagamenti da processare</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            <Badge className="bg-blue-100 text-blue-800">
              {paymentData.completedPayments}
            </Badge>
          </div>
          <div className="text-2xl font-bold">Completati</div>
          <div className="text-sm text-gray-600 mt-1">Questo mese</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-purple-600" />
            <Badge className="bg-purple-100 text-purple-800">Prossimo</Badge>
          </div>
          <div className="text-2xl font-bold">€{paymentData.nextPayoutAmount}</div>
          <div className="text-sm text-gray-600 mt-1">{paymentData.nextPayoutDate}</div>
        </CardContent>
      </Card>
    </div>
  );
};
