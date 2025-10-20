import { useHostInvoices } from '@/hooks/fiscal/useHostInvoices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, FileCode, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface HostInvoiceHistoryProps {
  hostId?: string;
}

export const HostInvoiceHistory = ({ hostId }: HostInvoiceHistoryProps) => {
  const {
    invoices,
    isLoading,
    error,
    totals,
    selectedYear,
    setSelectedYear,
    statusFilter,
    setStatusFilter,
    downloadInvoice,
    availableYears
  } = useHostInvoices(hostId);

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Bozza
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Inviata
          </Badge>
        );
      case 'delivered':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Consegnata
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Rifiutata
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Da inviare
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Caricamento fatture...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">Errore nel caricamento delle fatture</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fatture Totali</CardDescription>
            <CardTitle className="text-2xl">{totals.count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Imponibile</CardDescription>
            <CardTitle className="text-2xl">
              €{totals.totalBase.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>IVA</CardDescription>
            <CardTitle className="text-2xl">
              €{totals.totalVat.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Totale</CardDescription>
            <CardTitle className="text-2xl">
              €{totals.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storico Fatture</CardTitle>
              <CardDescription>
                Visualizza e scarica le tue fatture ricevute da Workover
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="sent">Inviata</SelectItem>
                  <SelectItem value="delivered">Consegnata</SelectItem>
                  <SelectItem value="rejected">Rifiutata</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nessuna fattura trovata per {selectedYear}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Imponibile</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell className="text-right">
                      €{Number(invoice.base_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      €{Number(invoice.vat_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{Number(invoice.total_amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.xml_delivery_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {invoice.pdf_file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadInvoice(invoice, 'pdf')}
                            title="Scarica PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {invoice.xml_file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadInvoice(invoice, 'xml')}
                            title="Scarica XML"
                          >
                            <FileCode className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DAC7 Information */}
      {totals.count > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-sm">Informazione DAC7</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nel {selectedYear} hai ricevuto <strong>{totals.count} fatture</strong> per un totale di{' '}
              <strong>€{totals.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong>.
              {totals.totalAmount >= 2000 && totals.count >= 25 && (
                <span className="text-destructive font-medium">
                  {' '}Hai superato le soglie DAC7 (€2.000 e 25 transazioni).
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
