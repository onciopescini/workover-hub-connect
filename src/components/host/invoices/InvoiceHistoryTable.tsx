import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface InvoiceHistoryTableProps {
  data: any[];
}

export function InvoiceHistoryTable({ data }: InvoiceHistoryTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nessun documento fiscale emesso per l'anno selezionato.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data Servizio</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Importo</TableHead>
            <TableHead>Emesso il</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((payment) => {
            const isInvoice = payment.host_invoice_required;
            const isCreditNote = payment.credit_note_issued_by_host;
            const booking = payment.booking;
            const coworker = Array.isArray(booking?.coworker) ? booking.coworker[0] : booking?.coworker;

            return (
              <TableRow key={payment.id}>
                <TableCell>
                  {booking?.booking_date 
                    ? format(parseISO(booking.booking_date), 'dd MMM yyyy', { locale: it })
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge variant={isInvoice ? 'default' : 'secondary'}>
                    {isInvoice ? 'Fattura' : 'Nota Credito'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {coworker 
                    ? `${coworker.first_name} ${coworker.last_name}`
                    : 'N/A'}
                </TableCell>
                <TableCell className="font-mono">
                  €{(payment.host_amount || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  {payment.created_at
                    ? format(parseISO(payment.created_at), 'dd MMM yyyy', { locale: it })
                    : 'N/A'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
