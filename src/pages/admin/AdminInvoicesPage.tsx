import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  INVOICE_QUEUE_STATUS_LABELS,
  INVOICING_QUERY_KEYS,
  INVOICING_RPC,
  INVOICING_TABLES,
} from '@/constants/invoicing';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/LoadingScreen';
import { Tables } from '@/integrations/supabase/types';

type InvoiceQueueViewRow = Tables<'admin_platform_fee_invoices_queue_view'>;

const STATUS_STYLES: Record<InvoiceQueueViewRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const formatPlatformFee = (amount: number, currency: string): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

const AdminInvoicesPage = () => {
  const queryClient = useQueryClient();

  const {
    data: queueRows,
    isLoading,
    isRefetching,
    error,
  } = useQuery({
    queryKey: [INVOICING_QUERY_KEYS.ADMIN_PLATFORM_FEE_INVOICES_QUEUE],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from(INVOICING_TABLES.ADMIN_PLATFORM_FEE_INVOICES_QUEUE_VIEW)
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      return data;
    },
  });

  const processInvoiceMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const { data, error: rpcError } = await supabase.rpc(INVOICING_RPC.ADMIN_PROCESS_INVOICE_QUEUE, {
        queue_id: queueId,
      });

      if (rpcError) {
        throw rpcError;
      }

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [INVOICING_QUERY_KEYS.ADMIN_PLATFORM_FEE_INVOICES_QUEUE],
      });
    },
  });

  const processingQueueIds = useMemo(() => {
    if (processInvoiceMutation.variables === undefined || processInvoiceMutation.isPending === false) {
      return new Set<string>();
    }

    return new Set<string>([processInvoiceMutation.variables]);
  }, [processInvoiceMutation.isPending, processInvoiceMutation.variables]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Errore imprevisto durante il caricamento.';

    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Errore nel caricamento della coda fatture: {errorMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">Coda Fatture Platform Fee</h1>
        <p className="text-sm text-gray-500">
          Vista amministrativa per monitorare e processare manualmente la coda fiscale dell&apos;incasso fee.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="text-lg">Invoice Queue</CardTitle>
          {isRefetching ? <span className="text-xs text-gray-500">Aggiornamento in corso...</span> : null}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creata il</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>P.IVA</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead className="text-right">Platform Fee</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(queueRows ?? []).length > 0 ? (
                  queueRows?.map((row) => {
                    const hostName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Host sconosciuto';
                    const isProcessingRow = processingQueueIds.has(row.id);
                    const canProcessManually = row.status !== 'completed' && !isProcessingRow;

                    return (
                      <TableRow key={row.id}>
                        <TableCell>{format(new Date(row.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-medium">{hostName}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.vat_number ?? '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{row.payment_id}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPlatformFee(row.platform_fee_amount, row.currency)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}
                          >
                            {INVOICE_QUEUE_STATUS_LABELS[row.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => processInvoiceMutation.mutate(row.id)}
                            disabled={!canProcessManually}
                          >
                            {isProcessingRow ? 'In elaborazione...' : 'Processa Manualmente'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-sm text-gray-500">
                      Nessuna invoice in coda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvoicesPage;
