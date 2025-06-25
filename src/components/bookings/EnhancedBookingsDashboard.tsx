
import React, { useState, useMemo } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { useEnhancedBookingsQuery, useEnhancedCancelBookingMutation, BookingFilter } from '@/hooks/queries/useEnhancedBookingsQuery';
import { BookingWithDetails } from '@/types/booking';
import { BookingsDashboardHeader } from './dashboard/BookingsDashboardHeader';
import { BookingsDashboardStats } from './dashboard/BookingsDashboardStats';
import { BookingsDashboardFilters } from './dashboard/BookingsDashboardFilters';
import { BookingsDashboardContent } from './dashboard/BookingsDashboardContent';
import { BookingsDashboardUnauthenticated } from './dashboard/BookingsDashboardUnauthenticated';
import { BookingsDashboardError } from './dashboard/BookingsDashboardError';

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
        const payment = b.payments && b.payments.length > 0 ? b.payments[0] : null;
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
      status: status === 'all' ? undefined : status as 'pending' | 'confirmed' | 'cancelled'
    }));
  };

  const handleDateRangeFilter = (range: { start: string; end: string } | undefined) => {
    setFilters(prev => ({
      ...prev,
      dateRange: range
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  if (!authState.isAuthenticated) {
    return <BookingsDashboardUnauthenticated />;
  }

  if (error) {
    return <BookingsDashboardError onRefresh={() => refetch()} />;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <BookingsDashboardHeader onRefresh={() => refetch()} isLoading={isLoading} />
      
      <BookingsDashboardStats stats={stats} />

      <BookingsDashboardFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onStatusFilter={handleStatusFilter}
        onDateRangeFilter={handleDateRangeFilter}
        onClearFilters={handleClearFilters}
      />

      <BookingsDashboardContent
        isLoading={isLoading}
        bookings={filteredBookings}
        searchTerm={searchTerm}
        getUserRole={getUserRole}
        isChatEnabled={isChatEnabled}
        onOpenMessageDialog={handleOpenMessageDialog}
        onOpenCancelDialog={handleOpenCancelDialog}
        messageDialogOpen={messageDialogOpen}
        setMessageDialogOpen={setMessageDialogOpen}
        messageBookingId={messageBookingId}
        messageSpaceTitle={messageSpaceTitle}
        cancelDialogOpen={cancelDialogOpen}
        setCancelDialogOpen={setCancelDialogOpen}
        selectedBooking={selectedBooking}
        onCancelBooking={handleCancelBooking}
        cancelBookingLoading={cancelBookingMutation.isPending}
      />
    </div>
  );
}
