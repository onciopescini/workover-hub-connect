
import React, { useState, useMemo } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Euro
} from 'lucide-react';
import { EnhancedBookingCard } from './EnhancedBookingCard';
import { MessageDialog } from '../messaging/MessageDialog';
import { CancelBookingDialog } from './CancelBookingDialog';
import { useEnhancedBookingsQuery, useEnhancedCancelBookingMutation, BookingFilter } from '@/hooks/queries/useEnhancedBookingsQuery';
import { BookingWithDetails } from '@/types/booking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';

export function EnhancedBookingsDashboard() {
  const { authState } = useAuth();
  const [filters, setFilters] = useState<BookingFilter>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [messageBookingId, setMessageBookingId] = useState("");
  const [messageSpaceTitle, setMessageSpaceTitle] = useState("");

  // Queries and mutations
  const { data: bookings = [], isLoading, error, refetch } = useEnhancedBookingsQuery(filters);
  const cancelBookingMutation = useEnhancedCancelBookingMutation();

  // Filter bookings based on search term
  const filteredBookings = useMemo(() => {
    if (!searchTerm) return bookings;
    
    const searchLower = searchTerm.toLowerCase();
    return bookings.filter(booking =>
      booking.space.title.toLowerCase().includes(searchLower) ||
      booking.space.address.toLowerCase().includes(searchLower) ||
      (booking.coworker && 
        `${booking.coworker.first_name} ${booking.coworker.last_name}`.toLowerCase().includes(searchLower))
    );
  }, [bookings, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    
    const totalRevenue = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => {
        const payment = Array.isArray(b.payments) ? b.payments[0] : b.payments;
        return sum + (payment?.amount || 0);
      }, 0);

    return { total, pending, confirmed, cancelled, totalRevenue };
  }, [bookings]);

  // Check if chat is enabled for booking
  const isChatEnabled = (booking: BookingWithDetails) => {
    if (booking.space?.confirmation_type === 'instant') {
      return booking.status === 'confirmed';
    } else {
      return booking.status === 'confirmed';
    }
  };

  // Determine user role in relation to booking
  const getUserRole = (booking: BookingWithDetails): "host" | "coworker" => {
    return booking.space.host_id === authState.user?.id ? "host" : "coworker";
  };

  // Event handlers
  const handleOpenMessageDialog = (bookingId: string, spaceTitle: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !isChatEnabled(booking)) {
      if (booking?.status === 'pending' && booking?.space?.confirmation_type === 'host_approval') {
        alert('La chat sarà disponibile dopo l\'approvazione dell\'host e il completamento del pagamento.');
      } else if (booking?.status === 'pending') {
        alert('La chat sarà disponibile dopo il completamento del pagamento.');
      } else {
        alert('Chat non disponibile per questa prenotazione.');
      }
      return;
    }
    
    setMessageBookingId(bookingId);
    setMessageSpaceTitle(spaceTitle);
    setMessageDialogOpen(true);
  };

  const handleOpenCancelDialog = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setCancelDialogOpen(true);
  };

  const handleCancelBooking = async (reason?: string) => {
    if (!selectedBooking) return;
    
    const userRole = getUserRole(selectedBooking);
    
    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: selectedBooking.id,
        isHost: userRole === 'host',
        reason: reason
      });
      setCancelDialogOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status
    }));
  };

  const handleDateRangeFilter = (range: { start: string; end: string } | undefined) => {
    setFilters(prev => ({
      ...prev,
      dateRange: range
    }));
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Accesso Richiesto</h2>
            <p className="text-gray-600 mb-4">Devi effettuare l'accesso per vedere le tue prenotazioni.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Errore nel Caricamento</h2>
            <p className="text-gray-600 mb-4">
              Si è verificato un errore nel caricamento delle prenotazioni.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Riprova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Prenotazioni</h1>
          <p className="text-gray-600">Monitora e gestisci tutte le tue prenotazioni</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Esporta
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totale</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Attesa</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confermate</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancellate</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fatturato</p>
                <p className="text-2xl font-bold text-green-600">€{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <Euro className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtri e Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Cerca per spazio, indirizzo o ospite..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stato prenotazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="confirmed">Confermate</SelectItem>
                <SelectItem value="cancelled">Cancellate</SelectItem>
              </SelectContent>
            </Select>

            <DatePickerWithRange 
              onDateChange={(range) => {
                if (range?.start && range?.end) {
                  handleDateRangeFilter({
                    start: format(range.start, 'yyyy-MM-dd'),
                    end: format(range.end, 'yyyy-MM-dd')
                  });
                } else {
                  handleDateRangeFilter(undefined);
                }
              }}
            />

            <Button variant="outline" onClick={() => {
              setFilters({});
              setSearchTerm("");
            }}>
              Azzera Filtri
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || filters.status ? 'Nessun risultato' : 'Nessuna prenotazione'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filters.status 
                ? 'Non sono state trovate prenotazioni con i filtri applicati.'
                : 'Non hai ancora ricevuto prenotazioni. Inizia pubblicando uno spazio!'
              }
            </p>
            {(!searchTerm && !filters.status) && (
              <Button onClick={() => window.location.href = '/space/new'}>
                Pubblica il tuo primo spazio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map((booking) => (
            <EnhancedBookingCard
              key={booking.id}
              booking={booking}
              userRole={getUserRole(booking)}
              onOpenMessageDialog={handleOpenMessageDialog}
              onOpenCancelDialog={handleOpenCancelDialog}
              isChatEnabled={isChatEnabled(booking)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <MessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        bookingId={messageBookingId}
        bookingTitle={messageSpaceTitle}
      />

      {selectedBooking && (
        <CancelBookingDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          booking={selectedBooking}
          onConfirm={handleCancelBooking}
          isLoading={cancelBookingMutation.isPending}
        />
      )}
    </div>
  );
}
