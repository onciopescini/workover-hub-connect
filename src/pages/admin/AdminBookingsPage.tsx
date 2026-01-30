import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Eye, 
  Filter, 
  Calendar as CalendarIcon, 
  MapPin, 
  MoreHorizontal, 
  RefreshCcw, 
  Trash2,
  AlertCircle,
  Ban
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import LoadingScreen from '@/components/LoadingScreen';
import { AdminBooking } from '@/types/admin';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { mapAdminBookingRecord } from '@/lib/admin-mappers';
import { formatCurrency } from '@/lib/format';
import { RefundModal } from '@/components/admin/RefundModal';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AdminBookingsPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [refundBooking, setRefundBooking] = useState<AdminBooking | null>(null);
  const [deleteBooking, setDeleteBooking] = useState<AdminBooking | null>(null);
  const [forceCancelBooking, setForceCancelBooking] = useState<AdminBooking | null>(null);

  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['admin_bookings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_bookings');

      if (error) {
        throw error;
      }

      return (data || [])
        .map((item) => mapAdminBookingRecord(item))
        .filter((item): item is AdminBooking => item !== null);
    },
  });

  // Soft-delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Prenotazione eliminata con successo');
      queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
      setDeleteBooking(null);
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    }
  });

  // Force Cancel mutation - full refund + status update
  const forceCancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-process-refund', {
        body: { 
          bookingId, 
          refundType: 'full', 
          reason: 'Admin force cancel - full refund override',
          forceCancel: true 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Prenotazione cancellata e rimborsata con successo');
      queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      setForceCancelBooking(null);
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    }
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive bg-destructive/10 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Error Loading Bookings</h3>
        <p>There was a problem fetching the bookings registry. Please try again later.</p>
        <p className="text-sm mt-4 text-muted-foreground">{String(error)}</p>
      </div>
    );
  }

  // Client-side filtering
  const filteredBookings = bookings?.filter((booking) => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (booking.coworker_name?.toLowerCase() || '').includes(searchLower) ||
      (booking.coworker_email?.toLowerCase() || '').includes(searchLower) ||
      (booking.space_name?.toLowerCase() || '').includes(searchLower) ||
      (booking.host_name?.toLowerCase() || '').includes(searchLower) ||
      booking.booking_id.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  }) || [];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'checked_in':
      case 'served':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'cancelled':
      case 'refunded':
      case 'disputed':
      case 'frozen':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      case 'pending':
      case 'pending_approval':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const canRefund = (status: string) => {
    return !['cancelled', 'refunded'].includes(status);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bookings Registry</h1>
          <p className="text-muted-foreground mt-1">Manage and oversee all platform bookings.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Placeholder for export actions */}
        </div>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, space..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold">
            All Bookings ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Coworker</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No bookings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.booking_id}>
                      {/* Date */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(booking.check_in_date), 'dd MMM yyyy', { locale: it })}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground pl-6">
                          {format(new Date(booking.check_in_date), 'HH:mm')} - {format(new Date(booking.check_out_date), 'HH:mm')}
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground line-clamp-1">
                            {booking.space_name}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{booking.host_name}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Coworker */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={booking.coworker_avatar_url || ''} />
                            <AvatarFallback>
                              {booking.coworker_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{booking.coworker_name || 'Unknown User'}</span>
                            <span className="text-xs text-muted-foreground">{booking.coworker_email}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <span className="font-mono font-medium">
                          {formatCurrency(booking.total_price, { cents: true })}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant="secondary" className={`${getStatusBadgeColor(booking.status)} capitalize`}>
                          {booking.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Azioni</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizza Dettagli
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setRefundBooking(booking)}
                              disabled={!canRefund(booking.status)}
                            >
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Rimborsa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setForceCancelBooking(booking)}
                              disabled={!canRefund(booking.status)}
                              className="text-orange-600 focus:text-orange-700"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Forza Cancellazione
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteBooking(booking)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Elimina (Force)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Refund Modal */}
      {refundBooking && (
        <RefundModal
          isOpen={!!refundBooking}
          onClose={() => setRefundBooking(null)}
          booking={refundBooking}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBooking} onOpenChange={() => setDeleteBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Conferma Eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare definitivamente la prenotazione{' '}
              <strong>#{deleteBooking?.booking_id.slice(0, 8)}</strong> di{' '}
              <strong>{deleteBooking?.coworker_name}</strong>.
              <br /><br />
              Questa azione:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Effettuerà un soft-delete (recuperabile)</li>
                <li>Libererà lo slot nel calendario</li>
                <li>Non rimborserà automaticamente il pagamento</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBooking && deleteMutation.mutate(deleteBooking.booking_id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Conferma Eliminazione'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Cancel Confirmation Dialog */}
      <AlertDialog open={!!forceCancelBooking} onOpenChange={() => setForceCancelBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-600" />
              Forza Cancellazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per cancellare la prenotazione{' '}
              <strong>#{forceCancelBooking?.booking_id.slice(0, 8)}</strong> di{' '}
              <strong>{forceCancelBooking?.coworker_name}</strong>.
              <br /><br />
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mt-2">
                <strong className="text-orange-800">Questa azione:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-orange-700">
                  <li>Emetterà un <strong>rimborso completo</strong> su Stripe</li>
                  <li>Cambierà lo stato a "cancelled"</li>
                  <li>Invierà notifica al coworker</li>
                  <li><strong>Non può essere annullata</strong></li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 text-white hover:bg-orange-700"
              onClick={() => forceCancelBooking && forceCancelMutation.mutate(forceCancelBooking.booking_id)}
              disabled={forceCancelMutation.isPending}
            >
              {forceCancelMutation.isPending ? 'Elaborazione...' : 'Conferma Cancellazione'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBookingsPage;
