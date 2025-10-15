/**
 * Payout Failures Widget - Fix B.5
 * Admin dashboard widget to monitor failed payouts
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

interface PayoutFailure {
  id: string;
  title: string;
  message: string;
  created_at: string | null;
  metadata: any;
}

export const PayoutFailuresWidget = () => {
  const [failures, setFailures] = useState<PayoutFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFailures = async () => {
      try {
        const { data, error } = await supabase
          .from('system_alarms')
          .select('id, title, message, created_at, metadata')
          .eq('alarm_type', 'payout_failed')
          .eq('resolved', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        setFailures(data || []);
      } catch (error) {
        sreLogger.error('Error fetching payout failures', {}, error as Error);
        toast.error('Errore nel caricamento dei payout falliti');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFailures();

    // Real-time subscription
    const channel = supabase
      .channel('payout-failures')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_alarms',
          filter: 'alarm_type=eq.payout_failed',
        },
        () => {
          fetchFailures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResolve = async (alarmId: string) => {
    try {
      const { error } = await supabase
        .from('system_alarms')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alarmId);

      if (error) throw error;

      setFailures(prev => prev.filter(f => f.id !== alarmId));
      toast.success('Alarm risolto');
    } catch (error) {
      sreLogger.error('Error resolving alarm', {}, error as Error);
      toast.error('Errore nella risoluzione dell\'alarm');
    }
  };

  const handleViewBooking = (bookingId: string) => {
    window.open(`/admin/bookings/${bookingId}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Falliti</CardTitle>
          <CardDescription>Caricamento...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Payout Falliti
        </CardTitle>
        <CardDescription>
          Payout non completati dopo 24 ore dalla schedulazione
        </CardDescription>
      </CardHeader>
      <CardContent>
        {failures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ✅ Nessun payout fallito al momento
          </p>
        ) : (
          <div className="space-y-4">
            {failures.map((failure) => (
              <div
                key={failure.id}
                className="flex items-start justify-between gap-4 rounded-lg border p-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Alta Priorità</Badge>
                    <p className="text-sm font-medium">{failure.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {failure.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rilevato:{' '}
                    {failure.created_at
                      ? new Date(failure.created_at).toLocaleString('it-IT')
                      : 'N/A'}
                  </p>
                  {failure.metadata?.stripe_transfer_id && (
                    <p className="text-xs text-muted-foreground">
                      Transfer ID: {failure.metadata.stripe_transfer_id}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleViewBooking(failure.metadata?.booking_id)
                    }
                    disabled={!failure.metadata?.booking_id}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleResolve(failure.id)}
                  >
                    Risolvi
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
