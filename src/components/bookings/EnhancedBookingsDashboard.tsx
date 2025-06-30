
import React, { useState, useMemo } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { useCoworkerBookings } from '@/hooks/queries/bookings/useCoworkerBookings';
import { useHostBookings } from '@/hooks/queries/bookings/useHostBookings';
import { useEnhancedCancelBookingMutation, BookingFilter } from '@/hooks/queries/useEnhancedBookingsQuery';
import { BookingWithDetails } from '@/types/booking';
import { BookingsDashboardHeader } from './dashboard/BookingsDashboardHeader';
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

  // Determine user role and fetch appropriate bookings
  const userRole = authState.profile?.role;
  const isHost = userRole === 'host' || userRole === 'admin';

  // Use role-specific hooks with error boundary
  const coworkerQuery = useCoworkerBookings(filters);
  const hostQuery = useHostBookings(filters);

  // Select the appropriate query based on user role
  const activeQuery = isHost ? hostQuery : coworkerQuery;
  const { data: bookings = [], isLoading, error, refetch } = activeQuery;

  const cancelBookingMutation = useEnhancedCancelBookingMutation();

  console.log('🔍 EnhancedBookingsDashboard:', {
    userId: authState.user?.id,
    userRole,
    isHost,
    bookingsCount: bookings.length,
    activeQuery: isHost ? 'host' : 'coworker',
    hasError: !!error
  });

  // Filter bookings based on search term with error handling
  const filteredBookings = useMemo(() => {
    try {
      if (!searchTerm || !Array.isArray(bookings)) return bookings;
      
      const searchLower = searchTerm.toLowerCase().trim();
      return bookings.filter(booking => {
        if (!booking) return false;
        
        const spaceTitle = booking.space?.title?.toLowerCase() || '';
        const spaceAddress = booking.space?.address?.toLowerCase() || '';
        const coworkerName = booking.coworker 
          ? `${booking.coworker.first_name || ''} ${booking.coworker.last_name || ''}`.toLowerCase()
          : '';
        
        return spaceTitle.includes(searchLower) ||
               spaceAddress.includes(searchLower) ||
               coworkerName.includes(searchLower);
      });
    } catch (err) {
      console.error('❌ Error filtering bookings:', err);
      return bookings;
    }
  }, [bookings, searchTerm]);

  // Calculate role-specific statistics with error handling
  const stats = useMemo(() => {
    try {
      if (!Array.isArray(bookings)) {
        return { total: 0, pending: 0, confirmed: 0, cancelled: 0, totalRevenue: 0 };
      }

      const total = bookings.length;
      const pending = bookings.filter(b => b?.status === 'pending').length;
      const confirmed = bookings.filter(b => b?.status === 'confirmed').length;
      const cancelled = bookings.filter(b => b?.status === 'cancelled').length;
      
      const totalRevenue = bookings
        .filter(b => b?.status === 'confirmed')
        .reduce((sum, b) => {
          const payment = b?.payments && Array.isArray(b.payments) && b.payments.length > 0 ? b.payments[0] : null;
          return sum + (payment?.amount || 0);
        }, 0);

      return { total, pending, confirmed, cancelled, totalRevenue };
    } catch (err) {
      console.error('❌ Error calculating stats:', err);
      return { total: 0, pending: 0, confirmed: 0, cancelled: 0, totalRevenue: 0 };
    }
  }, [bookings]);

  // Check if chat is enabled for booking
  const isChatEnabled = (booking: BookingWithDetails) => {
    try {
      if (!booking) return false;
      
      if (booking.space?.confirmation_type === 'instant') {
        return booking.status === 'confirmed';
      } else {
        return booking.status === 'confirmed';
      }
    } catch (err) {
      console.error('❌ Error checking chat status:', err);
      return false;
    }
  };

  // Determine user role in relation to specific booking
  const getUserRole = (booking: BookingWithDetails): "host" | "coworker" => {
    return isHost ? "host" : "coworker";
  };

  // Event handlers with error handling
  const handleOpenMessageDialog = (bookingId: string, spaceTitle: string) => {
    try {
      const booking = bookings.find(b => b?.id === bookingId);
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
    } catch (err) {
      console.error('❌ Error opening message dialog:', err);
    }
  };

  const handleOpenCancelDialog = (booking: BookingWithDetails) => {
    try {
      if (!booking) return;
      setSelectedBooking(booking);
      setCancelDialogOpen(true);
    } catch (err) {
      console.error('❌ Error opening cancel dialog:', err);
    }
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
      console.error('❌ Error cancelling booking:', error);
    }
  };

  const handleStatusFilter = (status: string) => {
    try {
      setFilters(prev => ({
        ...prev,
        status: status === 'all' ? undefined : status as 'pending' | 'confirmed' | 'cancelled'
      }));
    } catch (err) {
      console.error('❌ Error setting status filter:', err);
    }
  };

  const handleDateRangeFilter = (range: { start: string; end: string } | undefined) => {
    try {
      setFilters(prev => ({
        ...prev,
        dateRange: range
      }));
    } catch (err) {
      console.error('❌ Error setting date range filter:', err);
    }
  };

  const handleClearFilters = () => {
    try {
      setFilters({});
      setSearchTerm("");
    } catch (err) {
      console.error('❌ Error clearing filters:', err);
    }
  };

  if (!authState.isAuthenticated) {
    return <BookingsDashboardUnauthenticated />;
  }

  if (error) {
    console.error('🚨 Dashboard error:', error);
    return <BookingsDashboardError onRefresh={() => refetch()} />;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <BookingsDashboardHeader
        totalBookings={stats.total}
        pendingCount={stats.pending}
        confirmedCount={stats.confirmed}
        totalRevenue={stats.totalRevenue}
      />

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
