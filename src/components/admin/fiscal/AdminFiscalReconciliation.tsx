import { usePaymentInvoiceReconciliation } from '@/hooks/admin/usePaymentInvoiceReconciliation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Download, RefreshCw, FileText, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const AdminFiscalReconciliation = () => {
  const {
    paymentsWithoutInvoice,
    isLoadingPayments,
    stats,
    isLoadingStats,
    regenerateInvoice,
    isRegenerating,
    exportReconciliationCSV,
    refetch
  } = usePaymentInvoiceReconciliation();

  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const handleRegenerateClick = (payment: any) => {
    setSelectedPayment(payment);
  };

  const confirmRegenerate = () => {
    if (selectedPayment) {
      regenerateInvoice(selectedPayment);
      setSelectedPayment(null);
    }
  };

  if (isLoadingStats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Caricamento statistiche...</p>
        </CardContent>
      </Card>
    );
  }

  const reconciliationRate = stats
    ? ((stats.paymentsWithInvoice / stats.totalPayments) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Riconciliazione Fiscale</h2>
          <p className="text-muted-foreground mt-1">
            Verifica pagamenti e gestisci fatture mancanti
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch} disabled={isLoadingPayments}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Aggiorna
          </Button>
          <Button variant="outline" onClick={exportReconciliationCSV}>
            <Download className="mr-2 h-4 w-4" />
            Esporta CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pagamenti Totali</CardDescription>
            <CardTitle className="text-2xl">{stats?.totalPayments || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              €{(stats?.totalAmount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Con Fattura</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              {stats?.paymentsWithInvoice || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-success border-success">
              {reconciliationRate}% riconciliati
            </Badge>
          </CardContent>
        </Card>

        <Card className={paymentsWithoutInvoice.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardDescription>Senza Fattura</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {stats?.paymentsWithoutInvoice || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-destructive font-medium">
              €{(stats?.missingInvoiceAmount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tasso Riconciliazione</CardDescription>
            <CardTitle className="text-2xl">{reconciliationRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${reconciliationRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Without Invoice */}
      {paymentsWithoutInvoice.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-1" />
              <div className="flex-1">
                <CardTitle>Pagamenti Senza Fattura</CardTitle>
                <CardDescription>
                  {paymentsWithoutInvoice.length} pagamenti completati necessitano di fattura
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPayments ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Caricamento pagamenti...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Spazio</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsWithoutInvoice.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.booking_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {payment.booking?.spaces?.title || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{Number(payment.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: it })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-success/10 text-success border-success">
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateClick(payment)}
                          disabled={isRegenerating || !payment.booking?.spaces?.host_id}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Genera Fattura
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {!isLoadingPayments && paymentsWithoutInvoice.length === 0 && (
        <Card className="border-success">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sistema Riconciliato</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Tutti i pagamenti completati hanno una fattura associata. 
              Il sistema fiscale è completamente riconciliato.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Generazione Fattura</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler generare una fattura per questo pagamento?
              {selectedPayment && (
                <div className="mt-4 p-3 bg-muted rounded-md space-y-1">
                  <p className="text-sm">
                    <strong>Payment ID:</strong> {selectedPayment.id.substring(0, 12)}...
                  </p>
                  <p className="text-sm">
                    <strong>Importo:</strong> €{Number(selectedPayment.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm">
                    <strong>Data:</strong> {format(new Date(selectedPayment.created_at), 'dd MMMM yyyy', { locale: it })}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegenerate}>
              Genera Fattura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
