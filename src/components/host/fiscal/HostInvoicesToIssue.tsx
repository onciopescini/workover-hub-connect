import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { FileText, Download, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const HostInvoicesToIssue = () => {
  const { authState } = useAuth();

  const { data: paymentsRequiringInvoice, isLoading } = useQuery({
    queryKey: ['host-invoices-to-issue', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];
      
      // Fetch payments without nested spaces relation
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          host_amount,
          host_invoice_deadline,
          host_invoice_reminder_sent,
          created_at,
          bookings (
            id,
            booking_date,
            space_id
          )
        `)
        .eq('host_invoice_required', true);

      if (error) throw error;
      
      // Fetch spaces separately and filter by host
      const spaceIds = [...new Set(payments?.map(p => p.bookings?.space_id).filter(Boolean) || [])];
      const { data: spaces } = await supabase
        .from('spaces')
        .select('id, title, host_id')
        .in('id', spaceIds)
        .eq('host_id', authState.user.id);
        
      const spacesMap = new Map(spaces?.map(s => [s.id, s]) || []);
      
      // Filter payments by host's spaces and attach space info
      return (payments || [])
        .filter(p => p.bookings?.space_id && spacesMap.has(p.bookings.space_id))
        .map(p => ({
          ...p,
          bookings: {
            ...p.bookings,
            spaces: p.bookings?.space_id ? spacesMap.get(p.bookings.space_id) : null
          }
        }));
    },
    enabled: !!authState.user?.id,
  });

  const downloadGuide = async (paymentId: string) => {
    try {
      // Get guide URL from storage
      const guidePath = `${authState.user?.id}/guide_${paymentId}.pdf`;
      const { data } = supabase.storage
        .from('host-invoices-guide')
        .getPublicUrl(guidePath);

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading guide:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Caricamento...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Fatture Canone da Emettere
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!paymentsRequiringInvoice || paymentsRequiringInvoice.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna fattura da emettere al momento
          </div>
        ) : (
          <div className="space-y-4">
            {paymentsRequiringInvoice.map((payment) => {
              const booking = payment.bookings;
              const space = booking?.spaces;
              const deadline = payment.host_invoice_deadline ? new Date(payment.host_invoice_deadline) : new Date();
              const isUrgent = deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;

              return (
                <Card key={payment.id} className={`p-4 ${isUrgent ? 'border-destructive' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{space?.title}</h4>
                        {isUrgent && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgente
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Prenotazione: {new Date(booking.booking_date).toLocaleDateString('it-IT')}
                        </p>
                        <p className="font-medium">Importo canone: €{Number(payment.host_amount).toFixed(2)}</p>
                        <p className={isUrgent ? 'text-destructive font-medium' : ''}>
                          Scadenza: {deadline.toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => downloadGuide(payment.id)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Scarica Guida
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded text-sm space-y-2">
          <p className="font-medium">⚠️ Importante:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Devi emettere fattura elettronica tramite il tuo software di fatturazione</li>
            <li>Scarica la guida PDF per ogni prenotazione con tutti i dati necessari</li>
            <li>La fattura deve essere inviata al Sistema di Interscambio (SdI)</li>
            <li>Conserva copia della fattura emessa per i tuoi archivi</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
