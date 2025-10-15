import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useHostPendingInvoices, useHostPendingCreditNotes, useHostInvoiceHistory } from '@/hooks/queries/useHostInvoices';
import { InvoiceCard } from '@/components/host/invoices/InvoiceCard';
import { CreditNoteCard } from '@/components/host/invoices/CreditNoteCard';
import { InvoiceHistoryTable } from '@/components/host/invoices/InvoiceHistoryTable';

export default function HostInvoicesPage() {
  const { authState } = useAuth();
  const hostId = authState.profile?.id;
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: pendingInvoices, isLoading: loadingInvoices } = useHostPendingInvoices(hostId || '');
  const { data: pendingCreditNotes, isLoading: loadingCreditNotes } = useHostPendingCreditNotes(hostId || '');
  const { data: history, isLoading: loadingHistory } = useHostInvoiceHistory(hostId || '', selectedYear);

  const hasExpiredInvoices = pendingInvoices?.some(p => 
    new Date(p.host_invoice_deadline || '') < new Date()
  );

  const handleExportCSV = () => {
    if (!history || history.length === 0) return;

    const headers = ['Data', 'Tipo', 'Cliente', 'Importo'];
    const rows = history.map(p => {
      const coworker = Array.isArray(p.booking?.coworker) ? p.booking.coworker[0] : p.booking?.coworker;
      return [
        p.booking?.booking_date || '',
        !p.host_invoice_required ? 'Nota di Credito' : 'Fattura',
        `${coworker?.first_name || ''} ${coworker?.last_name || ''}`,
        `€${(p.host_amount || 0).toFixed(2)}`
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fatture_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestione Fatture</h1>
          <p className="text-muted-foreground">Emetti fatture e note di credito per i tuoi servizi</p>
        </div>
      </div>

      {hasExpiredInvoices && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fatture Scadute</AlertTitle>
          <AlertDescription>
            Hai fatture da emettere oltre la scadenza T+7. Provvedi all'emissione per ricevere il payout.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Fatture da Emettere
            {pendingInvoices && pendingInvoices.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {pendingInvoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="credit-notes">
            Note di Credito
            {pendingCreditNotes && pendingCreditNotes.length > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-xs">
                {pendingCreditNotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Storico</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loadingInvoices ? (
            <div className="text-center py-8">Caricamento fatture...</div>
          ) : pendingInvoices && pendingInvoices.length > 0 ? (
            pendingInvoices.map(payment => (
              <InvoiceCard key={payment.id} payment={payment} />
            ))
          ) : (
            <Alert>
              <AlertDescription>
                Nessuna fattura da emettere al momento. Le fatture appariranno qui dopo che i servizi sono stati erogati.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="credit-notes" className="space-y-4">
          {loadingCreditNotes ? (
            <div className="text-center py-8">Caricamento note di credito...</div>
          ) : pendingCreditNotes && pendingCreditNotes.length > 0 ? (
            pendingCreditNotes.map(payment => (
              <CreditNoteCard key={payment.id} payment={payment} />
            ))
          ) : (
            <Alert>
              <AlertDescription>
                Nessuna nota di credito richiesta. Le note di credito appariranno qui dopo cancellazioni di prenotazioni già fatturate.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border rounded-md px-3 py-2"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Esporta CSV
            </Button>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8">Caricamento storico...</div>
          ) : (
            <InvoiceHistoryTable data={history || []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
