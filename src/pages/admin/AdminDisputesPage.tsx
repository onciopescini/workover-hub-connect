import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  ADMIN_DISPUTES_QUERY_KEY,
  BOOKING_RESOLUTION_STATUS,
  DISPUTE_OPEN_STATUSES,
  DISPUTE_REASON_PREVIEW_LENGTH,
  DISPUTE_STATUS,
} from '@/constants/admin-disputes';
import { formatCurrency } from '@/lib/format';
import LoadingScreen from '@/components/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type BookingStatus = NonNullable<Database['public']['Tables']['bookings']['Row']['status']>; 
type DisputeStatus = Database['public']['Tables']['disputes']['Row']['status'];

const adminDisputeSchema = z.object({
  id: z.string().uuid(),
  booking_id: z.string().uuid(),
  reason: z.string(),
  status: z.enum([DISPUTE_STATUS.OPEN, DISPUTE_STATUS.RESOLVED, DISPUTE_STATUS.CLOSED]),
  created_at: z.string(),
  booking: z
    .object({
      id: z.string().uuid(),
      booking_date: z.string(),
      start_time: z.string().nullable(),
      end_time: z.string().nullable(),
      total_price: z.number().nullable(),
      status: z.custom<BookingStatus>((value) => typeof value === 'string' && value.length > 0).nullable(),
      space: z
        .object({
          title: z.string(),
          host: z
            .object({
              first_name: z.string().nullable(),
              last_name: z.string().nullable(),
            })
            .nullable(),
        })
        .nullable(),
    })
    .nullable(),
  guest: z
    .object({
      first_name: z.string().nullable(),
      last_name: z.string().nullable(),
    })
    .nullable(),
});

const adminDisputesSchema = z.array(adminDisputeSchema);

type AdminDispute = {
  id: string;
  bookingId: string;
  reason: string;
  disputeStatus: DisputeStatus;
  createdAt: string;
  bookingDate: string;
  startTime: string | null;
  endTime: string | null;
  bookingStatus: BookingStatus;
  totalPrice: number | null;
  spaceTitle: string;
  guestName: string;
  hostName: string;
};

type ResolutionAction = 'approve_refund' | 'deny_refund';

type RefundFunctionSuccessResponse = {
  success: true;
  data: {
    booking_id: string;
    payment_id: string;
    stripe_refund_id: string;
    stripe_refund_status: string;
    idempotency_key: string;
  };
};

type RefundFunctionErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type ErrorWithContext = Error & {
  context?: {
    json?: () => Promise<unknown>;
  };
};

const getPersonName = (firstName: string | null, lastName: string | null, fallback: string): string => {
  const fullName = [firstName, lastName].filter((part) => Boolean(part && part.trim().length > 0)).join(' ').trim();
  return fullName.length > 0 ? fullName : fallback;
};

const bookingStatusClassMap: Record<string, string> = {
  disputed: 'bg-amber-100 text-amber-800 border-amber-200',
  refunded: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  checked_out: 'bg-blue-100 text-blue-800 border-blue-200',
  checked_in: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const disputeStatusClassMap: Record<string, string> = {
  open: 'bg-destructive/10 text-destructive border-destructive/20',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

const getStatusClass = (status: string, map: Record<string, string>): string => {
  return map[status] ?? 'bg-muted text-muted-foreground border-border';
};

const isRefundSuccessResponse = (value: unknown): value is RefundFunctionSuccessResponse => {
  if (typeof value !== 'object' || value === null || !('success' in value)) {
    return false;
  }

  return value.success === true;
};

const isRefundErrorResponse = (value: unknown): value is RefundFunctionErrorResponse => {
  if (typeof value !== 'object' || value === null || !('success' in value) || !('error' in value)) {
    return false;
  }

  const response = value as { success: unknown; error: unknown };
  if (response.success !== false || typeof response.error !== 'object' || response.error === null) {
    return false;
  }

  const error = response.error as { code?: unknown; message?: unknown };
  return typeof error.code === 'string' && typeof error.message === 'string';
};

const isIdempotentReplayMessage = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes('idempotent replay') || normalizedMessage.includes('idempotenc');
};

const parseRefundFunctionError = async (error: unknown): Promise<RefundFunctionErrorResponse | null> => {
  if (!(error instanceof Error)) {
    return null;
  }

  const errorWithContext = error as ErrorWithContext;

  if (!errorWithContext.context || typeof errorWithContext.context.json !== 'function') {
    return null;
  }

  try {
    const parsed = await errorWithContext.context.json();
    if (isRefundErrorResponse(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const buildAdminDisputesQuery = () => {
  return supabase
    .from('disputes')
    .select(`
      id,
      booking_id,
      reason,
      status,
      created_at,
      guest:profiles!disputes_guest_id_fkey (
        first_name,
        last_name
      ),
      booking:bookings!disputes_booking_id_fkey (
        id,
        booking_date,
        start_time,
        end_time,
        total_price,
        status,
        space:spaces!bookings_space_id_fkey (
          title,
          host:profiles!spaces_host_id_fkey (
            first_name,
            last_name
          )
        )
      )
    `)
    .order('created_at', { ascending: false });
};

const fetchAdminDisputes = async (): Promise<AdminDispute[]> => {
  const { data, error } = await buildAdminDisputesQuery();

  if (error) {
    throw error;
  }

  const parsedData = adminDisputesSchema.safeParse(data);

  if (!parsedData.success) {
    throw new Error('Formato dati contestazioni non valido.');
  }

  return parsedData.data
    .filter((item) => Boolean(item.booking && item.booking.status))
    .map((item) => {
      const booking = item.booking;

      if (!booking || !booking.status) {
        return null;
      }

      return {
        id: item.id,
        bookingId: item.booking_id,
        reason: item.reason,
        disputeStatus: item.status,
        createdAt: item.created_at,
        bookingDate: booking.booking_date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        bookingStatus: booking.status,
        totalPrice: booking.total_price,
        spaceTitle: booking.space?.title ?? 'Spazio non disponibile',
        guestName: getPersonName(item.guest?.first_name ?? null, item.guest?.last_name ?? null, 'Guest sconosciuto'),
        hostName: getPersonName(
          booking.space?.host?.first_name ?? null,
          booking.space?.host?.last_name ?? null,
          'Host sconosciuto'
        ),
      } satisfies AdminDispute;
    })
    .filter((item): item is AdminDispute => item !== null);
};

const AdminDisputesPage = () => {
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const [action, setAction] = useState<ResolutionAction | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ADMIN_DISPUTES_QUERY_KEY,
    queryFn: fetchAdminDisputes,
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ dispute, resolutionAction }: { dispute: AdminDispute; resolutionAction: ResolutionAction }) => {
      if (resolutionAction === 'approve_refund') {
        const { data, error } = await supabase.functions.invoke('admin-process-refund', {
          body: {
            booking_id: dispute.bookingId,
            reason: `Admin approved dispute refund: ${dispute.reason}`,
          },
        });

        if (error) {
          const parsedError = await parseRefundFunctionError(error);
          const idempotentReplay =
            parsedError?.error.code === 'IDEMPOTENT_REPLAY' ||
            (parsedError ? isIdempotentReplayMessage(parsedError.error.message) : false) ||
            isIdempotentReplayMessage(error.message);

          if (idempotentReplay) {
            return;
          }

          throw new Error(parsedError?.error.message ?? error.message);
        }

        if (!isRefundSuccessResponse(data)) {
          throw new Error('Il rimborso su Stripe non è stato completato.');
        }

        return;
      }

      const bookingStatus: BookingStatus = BOOKING_RESOLUTION_STATUS.CHECKED_OUT;
      const disputeStatus: DisputeStatus = DISPUTE_STATUS.CLOSED;

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: bookingStatus })
        .eq('id', dispute.bookingId);

      if (bookingError) {
        throw bookingError;
      }

      const { error: disputeError } = await supabase
        .from('disputes')
        .update({ status: disputeStatus })
        .eq('id', dispute.id);

      if (disputeError) {
        throw disputeError;
      }
    },
    onSuccess: (_data, variables) => {
      const successMessage =
        variables.resolutionAction === 'approve_refund'
          ? 'Rimborso approvato: prenotazione rimborsata e disputa risolta.'
          : 'Rimborso rifiutato: prenotazione ripristinata e disputa chiusa.';

      toast.success(successMessage);
      void queryClient.invalidateQueries({ queryKey: ADMIN_DISPUTES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
      setSelectedDispute(null);
      setAction(null);
    },
    onError: (mutationError) => {
      toast.error(`Errore durante la risoluzione: ${mutationError.message}`);
    },
  });

  const openCount = useMemo(() => data?.filter((dispute) => DISPUTE_OPEN_STATUSES.includes(dispute.disputeStatus)).length ?? 0, [data]);

  const onConfirm = () => {
    if (!selectedDispute || !action) {
      return;
    }

    resolveDisputeMutation.mutate({ dispute: selectedDispute, resolutionAction: action });
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">Errore nel caricamento delle dispute</h2>
        <p className="mt-2 text-sm text-muted-foreground">Non è stato possibile recuperare i dati. Riprova tra qualche istante.</p>
        <p className="mt-3 text-xs text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Disputes Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci le contestazioni tra Guest e Host. Aperte: <span className="font-semibold text-foreground">{openCount}</span>
          </p>
        </header>

        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID / Data</TableHead>
                  <TableHead>Chi</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nessuna contestazione disponibile.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((dispute) => {
                    const isOpen = DISPUTE_OPEN_STATUSES.includes(dispute.disputeStatus);
                    const reasonPreview =
                      dispute.reason.length > DISPUTE_REASON_PREVIEW_LENGTH
                        ? `${dispute.reason.slice(0, DISPUTE_REASON_PREVIEW_LENGTH)}...`
                        : dispute.reason;

                    return (
                      <TableRow key={dispute.id}>
                        <TableCell className="min-w-[200px] align-top">
                          <p className="font-mono text-xs text-muted-foreground">#{dispute.bookingId.slice(0, 8)}</p>
                          <p className="font-medium">{format(new Date(dispute.createdAt), 'dd MMM yyyy, HH:mm', { locale: it })}</p>
                          <p className="text-xs text-muted-foreground">
                            Booking: {format(new Date(dispute.bookingDate), 'dd MMM yyyy', { locale: it })}
                          </p>
                          {(dispute.startTime || dispute.endTime) && (
                            <p className="text-xs text-muted-foreground">
                              {dispute.startTime ?? '--:--'} - {dispute.endTime ?? '--:--'}
                            </p>
                          )}
                        </TableCell>

                        <TableCell className="min-w-[220px] align-top">
                          <p className="font-medium">{dispute.guestName}</p>
                          <p className="text-xs text-muted-foreground">vs</p>
                          <p className="font-medium">{dispute.hostName}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{dispute.spaceTitle}</p>
                        </TableCell>

                        <TableCell className="max-w-[320px] align-top">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="cursor-help text-sm text-muted-foreground">{reasonPreview}</p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>{dispute.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>

                        <TableCell className="min-w-[210px] align-top">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={`capitalize ${getStatusClass(dispute.disputeStatus, disputeStatusClassMap)}`}>
                              Disputa: {dispute.disputeStatus}
                            </Badge>
                            <Badge variant="outline" className={`capitalize ${getStatusClass(dispute.bookingStatus, bookingStatusClassMap)}`}>
                              Booking: {dispute.bookingStatus.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Totale: {formatCurrency(dispute.totalPrice ?? 0, { cents: true })}
                          </p>
                        </TableCell>

                        <TableCell className="min-w-[220px] text-right align-top">
                          {isOpen ? (
                            <div className="flex flex-col gap-2 sm:items-end">
                              <Button
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                  setSelectedDispute(dispute);
                                  setAction('approve_refund');
                                }}
                              >
                                Approva Rimborso
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                  setSelectedDispute(dispute);
                                  setAction('deny_refund');
                                }}
                              >
                                Rifiuta Rimborso
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nessuna azione disponibile</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog
        open={Boolean(selectedDispute && action)}
        onOpenChange={(isOpenDialog) => {
          if (!isOpenDialog) {
            setSelectedDispute(null);
            setAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve_refund' ? 'Confermi approvazione rimborso?' : 'Confermi rifiuto rimborso?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'approve_refund'
                ? 'Questa azione imposterà la prenotazione su refunded e la disputa su resolved.'
                : 'Questa azione imposterà la prenotazione su checked_out e la disputa su closed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolveDisputeMutation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={resolveDisputeMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                onConfirm();
              }}
            >
              {resolveDisputeMutation.isPending ? 'Salvataggio...' : 'Conferma'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default AdminDisputesPage;
