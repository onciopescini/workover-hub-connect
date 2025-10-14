import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const HostInvoicesReceived = () => {
  const { authState } = useAuth();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['host-invoices-received', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          total_amount,
          base_amount,
          vat_amount,
          pdf_file_url,
          xml_file_url,
          xml_delivery_status,
          created_at,
          recipient_type
        `)
        .eq('recipient_id', authState.user.id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!authState.user?.id,
  });

  const downloadFile = async (url: string, filename: string) => {
    try {
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Caricamento fatture...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Fatture WorkOver Ricevute
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!invoices || invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna fattura trovata
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{invoice.invoice_number}</h4>
                      {invoice.xml_delivery_status === 'delivered' && (
                        <Badge variant="default">SdI Inviata</Badge>
                      )}
                      {invoice.xml_delivery_status === 'pending' && (
                        <Badge variant="secondary">In Elaborazione</Badge>
                      )}
                      {invoice.xml_delivery_status === 'rejected' && (
                        <Badge variant="destructive">Rifiutata SdI</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(invoice.invoice_date).toLocaleDateString('it-IT')}
                      </p>
                      <p>Imponibile: €{Number(invoice.base_amount).toFixed(2)}</p>
                      <p>IVA: €{Number(invoice.vat_amount).toFixed(2)}</p>
                      <p className="font-medium">Totale: €{Number(invoice.total_amount).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {invoice.pdf_file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(invoice.pdf_file_url!, `fattura_${invoice.invoice_number}.pdf`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    )}
                    {invoice.xml_file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(invoice.xml_file_url!, `fattura_${invoice.invoice_number}.xml`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        XML
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Queste sono le fatture emesse da WorkOver per il servizio di intermediazione (12,2% del canone).
        </p>
      </CardContent>
    </Card>
  );
};
