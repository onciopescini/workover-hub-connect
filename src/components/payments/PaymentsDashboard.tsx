import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PaymentFilters } from './PaymentFilters';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CreditCard, Loader2, AlertCircle } from "lucide-react";

interface Payment {
  id: string;
  booking_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
}

export function PaymentsDashboard() {
  const { authState } = useAuth();
  const [timeRange, setTimeRange] = useState('30');
  const [filter, setFilter] = useState('all');

  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['payments', timeRange, filter],
    queryFn: async () => {
      if (!authState.user?.id) return [];

      let query = supabase
        .from('payments')
        .select('*')
        .eq('user_id', authState.user.id);

      const today = new Date();
      let startDate;

      if (timeRange === '7') {
        startDate = new Date(today.setDate(today.getDate() - 7));
      } else if (timeRange === '30') {
        startDate = new Date(today.setDate(today.getDate() - 30));
      } else if (timeRange === '90') {
        startDate = new Date(today.setDate(today.getDate() - 90));
      } else if (timeRange === '365') {
        startDate = new Date(today.setDate(today.getDate() - 365));
      } else {
        startDate = new Date(today.setDate(today.getDate() - 30)); // Default to 30 days
      }

      query = query.gte('payment_date', startDate.toISOString());

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }

      return data as Payment[];
    },
    enabled: !!authState.user?.id,
  });

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="grid gap-4">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              <p className="text-sm text-muted-foreground">
                Errore nel caricamento dei pagamenti.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Transazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <PaymentFilters
              timeRange={timeRange}
              filter={filter}
              onTimeRangeChange={handleTimeRangeChange}
              onFilterChange={handleFilterChange}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Prenotazione
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: it })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.booking_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {payment.amount} {payment.currency}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{payment.status}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              <p className="text-sm text-muted-foreground">
                Nessun pagamento trovato per questo periodo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
