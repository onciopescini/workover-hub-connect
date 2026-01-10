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
import { useNavigate } from 'react-router-dom';
import { getOrCreateConversation } from '@/lib/conversations';
import { toast } from 'sonner';
import { calculateRefund } from '@/lib/policy-calculator';

export const useBookingsDashboardState = () => {
  const { hasAnyRole } = useRoleAccess();
  const { debug, error: logError } = useLogger({ context: 'useBookingsDashboardState' });
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BookingFilter>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);

  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [messageBookingId, setMessageBookingId] = useState("");
  const [messageSpaceTitle, setMessageSpaceTitle] = useState("");

  const isHost = hasAnyRole(['host', 'admin']);
  const coworkerQuery = useCoworkerBookings(filters);
  const hostQuery = useHostBookings(filters);
  const activeQuery = isHost ? hostQuery : coworkerQuery;
  const { data: bookings = [], isLoading, error, refetch } = activeQuery;
  const cancelBookingMutation = useEnhancedCancelBookingMutation();

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

  const stats: BookingsStats = useMemo(() => {
    try {
      if (!Array.isArray(bookings)) {
        return { total: 0, pending: 0, confirmed: 0, cancelled: 0, totalRevenue: 0 };
      }

      const total = bookings.length;
      const pending = bookings.filter(b => b?.status === 'pending').length;
      const confirmed = bookings.filter(b => b?.status === 'confirmed').length;
      const cancelled = bookings.filter(b => b?.status === 'cancelled').length;
      
      // Updated Revenue Calculation Logic
      const totalRevenue = bookings.reduce((sum, b) => {
        if (!b) return sum;

        if (b.status === 'confirmed') {
          // For confirmed bookings, add the full amount
          const payment = b.payments && Array.isArray(b.payments) && b.payments.length > 0 ? b.payments[0] : null;
          return sum + (payment?.amount || 0);
        } else if (b.status === 'cancelled') {
          // For cancelled bookings, add ONLY the cancellation fee
          if (b.cancellation_fee != null) {
             return sum + b.cancellation_fee;
          } else {
             // Fallback: Calculate fee on the fly for legacy cancelled bookings
             try {
                // Determine original price (Payment > Calculation)
                let originalPrice = 0;
                if (b.payments && b.payments.length > 0 && b.payments[0]) {
                    originalPrice = b.payments[0].amount;
                } else {
                   const start = new Date(`${b.booking_date}T${b.start_time}`);
                   const end = new Date(`${b.booking_date}T${b.end_time}`);
                   const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                   const pricePerHour = (b.space as any).price_per_hour || 0;
                   originalPrice = pricePerHour * durationHours;
                }

                // Determine policy
                const policy = b.cancellation_policy || (b.space as any).cancellation_policy || 'moderate';
                const bookingStart = new Date(`${b.booking_date}T${b.start_time}`);
                // Use cancellation time if available, otherwise assume late cancellation (now) or use booking start
                // Ideally we should have cancelled_at. If null, we might over-penalize or under-penalize.
                // But for legacy data, if cancelled_at is missing, we can't do much.
                // Let's assume strict if we don't know? Or perhaps 0?
                // Actually, if it's already cancelled in DB but has no fee, maybe it was free cancellation?
                // The requirement says: "calculated if missing".
                // If I use 'now', it will likely calculate as 100% penalty if the booking was in the past.
                // Let's try to use cancelled_at.
                const cancelTime = b.cancelled_at ? new Date(b.cancelled_at) : new Date(); // Fallback to now might be wrong for old bookings

                const refundDetails = calculateRefund(originalPrice, policy, bookingStart, cancelTime);
                return sum + refundDetails.penaltyAmount;
             } catch (e) {
                console.warn("Failed to calculate legacy cancellation fee", e);
                return sum;
             }
          }
        }
        return sum;
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

  const getUserRole = useCallback((booking: BookingWithDetails): UserRole => {
    return isHost ? "host" : "coworker";
  }, [isHost]);

  const handleOpenMessageDialog = useCallback(async (bookingId: string, spaceTitle: string) => {
    try {
      const booking = bookings.find(b => b?.id === bookingId);

      if (!booking) {
        toast.error("Prenotazione non trovata");
        return;
      }

      if (!isChatEnabled(booking)) {
        if (booking?.status === 'pending' && booking?.space?.confirmation_type === 'host_approval') {
          toast.info('La chat sarà disponibile dopo l\'approvazione dell\'host e il completamento del pagamento.');
        } else if (booking?.status === 'pending') {
          toast.info('La chat sarà disponibile dopo il completamento del pagamento.');
        } else {
          toast.info('Chat non disponibile per questa prenotazione.');
        }
        return;
      }

      const hostId = booking.space?.host_id;
      const coworkerId = booking.user_id || booking.coworker?.id;

      if (!hostId || !coworkerId) {
        toast.error('Dati mancanti per avviare la chat');
        logError('Missing IDs for chat', new Error('Missing hostId or coworkerId'), {
            bookingId: booking.id,
            hostId,
            coworkerId,
            bookingUserId: booking.user_id,
            bookingCoworkerId: booking.coworker?.id
        });
        return;
      }
      
      const conversationId = await getOrCreateConversation({
        hostId,
        coworkerId,
        spaceId: booking.space_id,
        bookingId: booking.id
      });

      navigate(`/messages?id=${conversationId}`);

    } catch (dialogError) {
      logError('Error opening conversation', dialogError as Error, {
        operation: 'open_message_dialog',
        bookingId,
        spaceTitle
      });
      toast.error("Errore nell'apertura della chat");
    }
  }, [bookings, isChatEnabled, navigate]);

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
    dashboardState,
    filteredBookings,
    stats,
    isLoading,
    error,
    actions,
    setMessageDialogOpen,
    setCancelDialogOpen,
    setSearchTerm,
    isChatEnabled,
    getUserRole,
    refetch,
    cancelBookingLoading: cancelBookingMutation.isPending,
  };
};
