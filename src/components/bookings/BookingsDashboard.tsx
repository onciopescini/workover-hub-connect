
import React, { useState } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookingWithDetails } from "@/types/booking";
import { BookingStatsCards } from './BookingStatsCards';
import { BookingFilters } from './BookingFilters';
import { BookingTabs } from './BookingTabs';
import { EnhancedBookingCard } from './EnhancedBookingCard';
import { EmptyBookingsState } from './EmptyBookingsState';
import { MessageDialog } from '../messaging/MessageDialog';
import { CancelBookingDialog } from './CancelBookingDialog';
import { Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function BookingsDashboard() {
  const { authState } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [messageBookingId, setMessageBookingId] = useState("");
  const [messageSpaceTitle, setMessageSpaceTitle] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['coworker-bookings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          space:spaces (
            id,
            title,
            address,
            photos,
            host_id,
            price_per_day
          ),
          coworker:profiles!bookings_user_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('user_id', authState.user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match BookingWithDetails type
      return (data || []).map((booking: any) => ({
        ...booking,
        coworker: Array.isArray(booking.coworker) ? booking.coworker[0] : booking.coworker
      })) as BookingWithDetails[];
    },
    enabled: !!authState.user
  });

  const filteredBookings = bookings.filter(booking => {
    const matchesTab = activeTab === 'all' || booking.status === activeTab;
    const matchesSearch = searchTerm === '' || 
      booking.space?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.space?.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter === '' || booking.booking_date.includes(dateFilter);
    
    return matchesTab && matchesSearch && matchesDate;
  });

  const handleOpenMessageDialog = (bookingId: string, spaceTitle: string) => {
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
    
    try {
      const { data, error } = await supabase.rpc('cancel_booking', {
        booking_id: selectedBooking.id,
        cancelled_by_host: false,
        reason: reason
      });

      if (error) throw error;
      
      // Refresh bookings data
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Le mie Prenotazioni</h1>
          <p className="text-gray-600">Gestisci e monitora tutte le tue prenotazioni</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            {bookings.length} prenotazioni totali
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <BookingStatsCards bookings={bookings} />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtra e Cerca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BookingFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
          />
        </CardContent>
      </Card>

      {/* Bookings Content */}
      {bookings.length === 0 ? (
        <EmptyBookingsState activeTab={activeTab} />
      ) : (
        <BookingTabs
          bookings={filteredBookings}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          <div className="grid gap-6">
            {filteredBookings.map((booking) => (
              <EnhancedBookingCard
                key={booking.id}
                booking={booking}
                userRole="coworker"
                onOpenMessageDialog={handleOpenMessageDialog}
                onOpenCancelDialog={handleOpenCancelDialog}
              />
            ))}
          </div>
        </BookingTabs>
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
        />
      )}
    </div>
  );
}
