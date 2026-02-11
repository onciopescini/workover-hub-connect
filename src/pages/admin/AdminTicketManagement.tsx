import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { SupportTicket } from '@/types/support';
import {
  ADMIN_TICKETS_FILTERS,
  type AdminTicketsFilter,
  SUPPORT_TICKET_PRIORITY_BADGE_CLASS,
  SUPPORT_TICKET_STATUS_LABELS,
  type SupportTicketStatus,
} from '@/constants/supportTickets';

const ADMIN_TICKETS_QUERY_KEY = ['admin', 'tickets'] as const;

interface TicketWithUserEmail extends SupportTicket {
  userEmail: string;
}

const getTicketEmail = async (userId: string): Promise<string> => {
  const { data, error } = await supabase.rpc('get_email_by_id', { user_id: userId });

  if (error) {
    return 'unknown@email';
  }

  if (typeof data !== 'string' || data.trim().length === 0) {
    return 'unknown@email';
  }

  return data;
};

const AdminTicketManagement = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUserEmail | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const filterFromQuery = searchParams.get('status');
  const activeFilter: AdminTicketsFilter =
    filterFromQuery === ADMIN_TICKETS_FILTERS.CLOSED
      ? ADMIN_TICKETS_FILTERS.CLOSED
      : filterFromQuery === ADMIN_TICKETS_FILTERS.MY
        ? ADMIN_TICKETS_FILTERS.MY
        : ADMIN_TICKETS_FILTERS.OPEN;

  const { data: currentUserData } = useQuery({
    queryKey: ['auth', 'current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ADMIN_TICKETS_QUERY_KEY,
    queryFn: async (): Promise<TicketWithUserEmail[]> => {
      const { data, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (ticketsError) {
        throw ticketsError;
      }

      const emailByUser = new Map<string, string>();
      const uniqueUserIds = Array.from(new Set((data ?? []).map((ticket) => ticket.user_id)));

      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const email = await getTicketEmail(userId);
          emailByUser.set(userId, email);
        }),
      );

      return (data ?? []).map((ticket) => ({
        ...ticket,
        userEmail: emailByUser.get(ticket.user_id) ?? 'unknown@email',
      }));
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, status, notes }: { ticketId: string; status: SupportTicketStatus; notes: string }) => {
      const { data, error: rpcError } = await supabase.rpc('admin_update_ticket', {
        ticket_id: ticketId,
        new_status: status,
        admin_notes: notes,
      });

      if (rpcError) {
        throw rpcError;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Ticket aggiornato correttamente');
      setAdminNotes('');
      setSelectedTicket(null);
      queryClient.invalidateQueries({ queryKey: ADMIN_TICKETS_QUERY_KEY });
    },
    onError: (mutationError) => {
      const errorMessage = mutationError instanceof Error ? mutationError.message : String(mutationError);
      toast.error(`Errore aggiornamento ticket: ${errorMessage}`);
    },
  });

  const filteredTickets = useMemo(() => {
    const source = tickets ?? [];

    if (activeFilter === ADMIN_TICKETS_FILTERS.CLOSED) {
      return source.filter((ticket) => ticket.status === 'closed');
    }

    if (activeFilter === ADMIN_TICKETS_FILTERS.MY) {
      const currentAdminId = currentUserData?.id;
      if (!currentAdminId) {
        return [];
      }

      return source.filter((ticket) => ticket.assigned_to === currentAdminId);
    }

    return source.filter((ticket) => ticket.status === 'open');
  }, [activeFilter, currentUserData?.id, tickets]);

  const openTicketsCount = useMemo(
    () => (tickets ?? []).filter((ticket) => ticket.status === 'open').length,
    [tickets],
  );

  const setFilter = (filter: AdminTicketsFilter) => {
    setSearchParams({ status: filter });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Admin Ticket Management</h1>
        <p className="text-muted-foreground mt-2">Gestione operativa, assegnazione e chiusura ticket.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Quick Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={activeFilter === ADMIN_TICKETS_FILTERS.OPEN ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setFilter(ADMIN_TICKETS_FILTERS.OPEN)}
            >
              Inbox (Open)
            </Button>
            <Button
              variant={activeFilter === ADMIN_TICKETS_FILTERS.MY ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setFilter(ADMIN_TICKETS_FILTERS.MY)}
            >
              My Tickets
            </Button>
            <Button
              variant={activeFilter === ADMIN_TICKETS_FILTERS.CLOSED ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setFilter(ADMIN_TICKETS_FILTERS.CLOSED)}
            >
              Archive (Closed)
            </Button>
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              Open adesso: <span className="font-semibold text-foreground">{openTicketsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Ticket Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento ticket...</p>
            ) : error ? (
              <p className="text-sm text-destructive">Errore caricamento ticket: {String(error.message)}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nessun ticket per questo filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setAdminNotes('');
                        }}
                      >
                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                        <TableCell>{ticket.userEmail}</TableCell>
                        <TableCell>
                          <Badge className={SUPPORT_TICKET_PRIORITY_BADGE_CLASS[ticket.priority] ?? 'bg-slate-100 text-slate-800'}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleString('it-IT') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{SUPPORT_TICKET_STATUS_LABELS[ticket.status as SupportTicketStatus] ?? ticket.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {ticket.status !== 'resolved' ? (
                            <Button
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateTicketMutation.mutate({ ticketId: ticket.id, status: 'resolved', notes: 'Quick resolve' });
                              }}
                              disabled={updateTicketMutation.isPending}
                            >
                              Quick Resolve
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedTicket(ticket);
                                setAdminNotes('');
                              }}
                            >
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedTicket !== null} onOpenChange={(open) => (!open ? setSelectedTicket(null) : undefined)}>
        <DialogContent className="max-w-2xl">
          {selectedTicket ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTicket.subject}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <p className="text-xs text-muted-foreground mb-2">Messaggio utente</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Admin Notes (private)</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    placeholder="Annotazioni private per audit interno..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateTicketMutation.mutate({
                        ticketId: selectedTicket.id,
                        status: 'in_progress',
                        notes: adminNotes,
                      })
                    }
                    disabled={updateTicketMutation.isPending}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    onClick={() =>
                      updateTicketMutation.mutate({
                        ticketId: selectedTicket.id,
                        status: 'resolved',
                        notes: adminNotes,
                      })
                    }
                    disabled={updateTicketMutation.isPending}
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      updateTicketMutation.mutate({
                        ticketId: selectedTicket.id,
                        status: 'closed',
                        notes: adminNotes,
                      })
                    }
                    disabled={updateTicketMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTicketManagement;
