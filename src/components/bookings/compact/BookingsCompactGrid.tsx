import React from 'react';
import { BookingWithDetails } from '@/types/booking';
import { CompactBookingCard } from './CompactBookingCard';
import { EmptyBookingsState } from '../EmptyBookingsState';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface BookingsCompactGridProps {
  bookings: BookingWithDetails[];
  isLoading: boolean;
  getUserRole: (booking: BookingWithDetails) => 'host' | 'coworker';
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  activeTab?: 'all' | 'pending' | 'confirmed' | 'cancelled';
}

export const BookingsCompactGrid: React.FC<BookingsCompactGridProps> = ({
  bookings,
  isLoading,
  getUserRole,
  isChatEnabled,
  onOpenMessageDialog,
  onOpenCancelDialog,
  activeTab = 'all'
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (bookings.length === 0) {
    return <EmptyBookingsState activeTab={activeTab} />;
  }

  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {bookings.map((booking) => (
        <CompactBookingCard
          key={booking.id}
          booking={booking}
          userRole={getUserRole(booking)}
          isChatEnabled={isChatEnabled(booking)}
          onOpenMessage={() => onOpenMessageDialog(booking.id, booking.workspaces?.name || 'Spazio')}
          onOpenCancel={() => onOpenCancelDialog(booking)}
        />
      ))}
    </div>
  );
};
