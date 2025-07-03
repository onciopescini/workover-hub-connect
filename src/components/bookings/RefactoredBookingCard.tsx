import React from 'react';
import { BookingWithDetails } from "@/types/booking";
import { UserRole } from '@/types/bookings/bookings-ui.types';
import { useBookingCardState } from '@/hooks/bookings/useBookingCardState';
import { BookingCardHeader } from './components/BookingCardHeader';
import { BookingCardContent } from './components/BookingCardContent';
import { BookingCardActions } from './components/BookingCardActions';
import { Card } from "@/components/ui/card";

interface RefactoredBookingCardProps {
  booking: BookingWithDetails;
  userRole: UserRole;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
}

export const RefactoredBookingCard = ({ 
  booking, 
  userRole, 
  onOpenMessageDialog, 
  onOpenCancelDialog 
}: RefactoredBookingCardProps) => {
  const { displayData, actions } = useBookingCardState({
    booking,
    userRole,
    onOpenMessageDialog,
    onOpenCancelDialog
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <BookingCardHeader
        booking={booking}
        status={booking.status}
      />
      
      <BookingCardContent
        booking={booking}
        displayData={displayData}
        userRole={userRole}
      />
      
      <BookingCardActions
        booking={booking}
        displayData={displayData}
        actions={actions}
      />
    </Card>
  );
};