import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HostNonFiscalReceipts = () => {
  const { authState } = useAuth();

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['host-non-fiscal-receipts', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];
      
      const { data, error } = await supabase
        .from('non_fiscal_receipts')
        .select(`
          id,
          receipt_number,
          receipt_date,
          total_amount,
          canone_amount,
          discount_amount,
          pdf_url,
          created_at,
          bookings (
            id,
            booking_date,
            spaces (
              title
            )
          )
        `)
        .eq('host_id', authState.user.id)
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!authState.user?.id,
  });

  const downloadReceipt = (url: string, receiptNumber: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Caricamento ricevute...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Le Mie Ricevute Non Fiscali
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!receipts || receipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna ricevuta trovata
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => {
              const booking = receipt.bookings;
              const space = booking?.spaces;

              return (
                <Card key={receipt.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold">{receipt.receipt_number}</h4>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(receipt.receipt_date).toLocaleDateString('it-IT')}
                        </p>
                        <p>Spazio: {space?.title}</p>
                        <p>Importo canone: €{Number(receipt.canone_amount).toFixed(2)}</p>
                        {receipt.discount_amount && receipt.discount_amount > 0 && (
                          <p>Sconto: €{Number(receipt.discount_amount).toFixed(2)}</p>
                        )}
                        <p className="font-medium">Totale: €{Number(receipt.total_amount).toFixed(2)}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadReceipt(receipt.pdf_url, receipt.receipt_number)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Scarica PDF
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded text-sm">
          <p className="font-medium mb-2">ℹ️ Informazioni:</p>
          <p className="text-muted-foreground">
            Queste ricevute sono generate automaticamente per le tue prenotazioni come host privato (senza P.IVA).
            Non hanno valore fiscale ma servono per tracciabilità interna.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
