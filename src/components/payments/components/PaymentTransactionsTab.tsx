
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, CreditCard, FileText, DollarSign } from 'lucide-react';
import { TransactionData } from '../types/payment-hub-types';

interface PaymentTransactionsTabProps {
  transactions: TransactionData[];
}

export const PaymentTransactionsTab: React.FC<PaymentTransactionsTabProps> = ({ transactions }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">In Attesa</Badge>;
      case 'disputed':
        return <Badge className="bg-red-100 text-red-800">Controversia</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer':
        return <FileText className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transazioni Recenti</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Esporta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                {getPaymentMethodIcon(transaction.paymentMethod)}
                <div>
                  <div className="font-medium">{transaction.guestName}</div>
                  <div className="text-sm text-gray-600">{transaction.spaceName}</div>
                  <div className="text-xs text-gray-500">{transaction.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold">€{transaction.amount.toFixed(2)}</div>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
