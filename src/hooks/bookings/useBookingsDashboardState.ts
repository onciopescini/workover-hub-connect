import { useState, useMemo, useCallback } from 'react';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useLogger } from "@/hooks/useLogger";
import { useCoworkerBookings } from '@/hooks/queries/bookings/useCoworkerBookings';
import { useHostBookings } from '@/hooks/queries/bookings/useHostBookings';
import { useEnhancedCancelBookingMutation, BookingFilter } from '@/hooks/queries/useEnhancedBookingsQuery';
import { BookingWithDetails } from '@/types/booking';
import { BookingsDashboardState, BookingsStats, BookingTabType } from '@/types/bookings/bookings-dashboard.types';
import { BookingsActions } from '@/types/bookings/bookings-actions.types';
import { UserRole } from '@/types/bookings/bookings-ui.types';

export const useBookingsDashboardState = () => {
  const { hasAnyRole } = useRoleAccess();
  const { debug, error: logError } = useLogger({ context: 'useBookingsDashboardState' });
  const [filters, setFilters] = useState<BookingFilter>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [messageBookingId, setMessageBookingId] = useState("");
  const [messageSpaceTitle, setMessageSpaceTitle] = useState("");

  // Determine user role and fetch appropriate bookings
  const isHost = hasAnyRole(['host', 'admin']);

  // Use role-specific hooks
  const coworkerQuery = useCoworkerBookings(filters);
  const hostQuery = useHostBookings(filters);

  // Select the appropriate query based on user role
  const activeQuery = isHost ? hostQuery : coworkerQuery;
  const { data: bookings = [], isLoading, error, refetch } = activeQuery;

  const cancelBookingMutation = useEnhancedCancelBookingMutation();

  // Filter bookings based on search term
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
    } catch (filterError) {
      logError('Error filtering bookings in dashboard', filterError as Error, {
        operation: 'filter_bookings_dashboard',
        searchTerm,
        bookingsCount: Array.isArray(bookings) ? bookings.length : 0
      });
      return bookings;
    }
  }, [bookings, searchTerm]);

  // Calculate statistics
  const stats: BookingsStats = useMemo(() => {
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
    } catch (statsError) {
      logError('Error calculating booking stats', statsError as Error, {
        operation: 'calculate_booking_stats',
        bookingsCount: Array.isArray(bookings) ? bookings.length : 0
      });
      return { total: 0, pending: 0, confirmed: 0, cancelled: 0, totalRevenue: 0 };
    }
  }, [bookings]);

  // Check if chat is enabled for booking
  const isChatEnabled = useCallback((booking: BookingWithDetails) => {
    try {
      if (!booking) return false;
      
      if (booking.space?.confirmation_type === 'instant') {
        return booking.status === 'confirmed';
      } else {
        return booking.status === 'confirmed';
      }
    } catch (chatError) {
      logError('Error checking chat status', chatError as Error, {
        operation: 'check_chat_status',
        bookingId: booking?.id,
        status: booking?.status
      });
      return false;
    }
  }, []);

  // Determine user role in relation to specific booking
  const getUserRole = useCallback((booking: BookingWithDetails): UserRole => {
    return isHost ? "host" : "coworker";
  }, [isHost]);

  const handleOpenMessageDialog = useCallback((bookingId: string, spaceTitle: string) => {
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
    } catch (dialogError) {
      logError('Error opening message dialog', dialogError as Error, {
        operation: 'open_message_dialog',
        bookingId,
        spaceTitle
      });
    }
  }, [bookings, isChatEnabled]);

  const handleOpenCancelDialog = useCallback((booking: BookingWithDetails) => {
    try {
      if (!booking) return;
      setSelectedBooking(booking);
      setCancelDialogOpen(true);
    } catch (dialogError) {
      logError('Error opening cancel dialog', dialogError as Error, {
        operation: 'open_cancel_dialog',
        bookingId: booking?.id
      });
    }
  }, []);

  const handleCancelBooking = useCallback(async (reason?: string) => {
    if (!selectedBooking) return;
    
    const userRole = getUserRole(selectedBooking);
    
    try {
      await cancelBookingMutation.mutateAsync({
        bookingId: selectedBooking.id,
        isHost: userRole === 'host',
        reason: reason ?? ''
      });
      setCancelDialogOpen(false);
      setSelectedBooking(null);
    } catch (cancelError) {
      logError('Error cancelling booking', cancelError as Error, {
        operation: 'cancel_booking',
        bookingId: selectedBooking?.id,
        userRole
      });
    }
  }, [selectedBooking, getUserRole, cancelBookingMutation]);

  const handleStatusFilter = useCallback((status: string) => {
    try {
      setFilters(prev => {
        const newFilters = { ...prev };
        if (status === 'all') {
          delete newFilters.status;
        } else {
          newFilters.status = status as 'pending' | 'confirmed' | 'cancelled';
        }
        return newFilters;
      });
    } catch (filterError) {
      logError('Error setting status filter', filterError as Error, {
        operation: 'set_status_filter',
        status
      });
    }
  }, []);

  const handleDateRangeFilter = useCallback((range: { start: string; end: string } | undefined) => {
    try {
      setFilters(prev => {
        const newFilters = { ...prev };
        if (range) {
          newFilters.dateRange = range;
        } else {
          delete newFilters.dateRange;
        }
        return newFilters;
      });
    } catch (filterError) {
      logError('Error setting date range filter', filterError as Error, {
        operation: 'set_date_range_filter',
        range
      });
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    try {
      setFilters({});
      setSearchTerm("");
    } catch (clearError) {
      logError('Error clearing filters', clearError as Error, {
        operation: 'clear_filters'
      });
    }
  }, []);

  const dashboardState: BookingsDashboardState = {
    activeTab: 'all',
    searchTerm,
    dateFilter: '',
    filters,
    selectedBooking,
    dialogStates: {
      messageDialog: messageDialogOpen,
      cancelDialog: cancelDialogOpen,
      messageBookingId,
      messageSpaceTitle,
    }
  };

  const actions: BookingsActions = {
    onOpenMessageDialog: handleOpenMessageDialog,
    onOpenCancelDialog: handleOpenCancelDialog,
    onCancelBooking: handleCancelBooking,
    onStatusFilter: handleStatusFilter,
    onDateRangeFilter: handleDateRangeFilter,
    onClearFilters: handleClearFilters,
  };

  return {
    // State
    dashboardState,
    filteredBookings,
    stats,
    isLoading,
    error,
    
    // Actions
    actions,
    
    // Dialog state setters
    setMessageDialogOpen,
    setCancelDialogOpen,
    setSearchTerm,
    
    // Utility functions
    isChatEnabled,
    getUserRole,
    refetch,
    
    // Mutation state
    cancelBookingLoading: cancelBookingMutation.isPending,
  };
};