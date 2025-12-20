import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface PayoutQueueItem {
  id: string;
  booking_date: string;
  workspaces: {
    name: string;
    host_id: string;
  };
  payments: {
    host_amount: number;
    payment_status: string;
  }[];
}

export const PayoutQueueWidget = () => {
  const { data: payoutQueue, isLoading } = useQuery({
    queryKey: ['payout-queue'],
    queryFn: async () => {
      // Note: 'served' status and payout columns will be added in future migration
      // For now, query confirmed bookings with payments
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          workspaces(name, host_id),
          payments(host_amount, payment_status)
        `)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const totalPending = payoutQueue?.reduce((sum, item) => {
    return sum + (item.payments[0]?.host_amount || 0);
  }, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Coda Payout
          </span>
          <Badge variant="secondary">
            €{totalPending.toFixed(2)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : !payoutQueue || payoutQueue.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">✓ Nessun payout in coda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payoutQueue.map((booking) => (
              <div key={booking.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-sm">{booking.workspaces?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Data: {new Date(booking.booking_date).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <Badge variant="outline">
                  €{booking.payments[0]?.host_amount?.toFixed(2) || '0.00'}
                </Badge>
              </div>
            ))}
            {payoutQueue.length >= 10 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Mostrati i primi 10 payout in coda
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
