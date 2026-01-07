import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';
import { EnhancedBookingCard } from '../EnhancedBookingCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BookingDayDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  bookings: BookingWithDetails[];
  getUserRole: (booking: BookingWithDetails) => "host" | "coworker";
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  onBookingClick?: (booking: BookingWithDetails) => void;
}

export const BookingDayDetailsDrawer = ({
  open,
  onOpenChange,
  selectedDate,
  bookings,
  getUserRole,
  isChatEnabled,
  onOpenMessageDialog,
  onOpenCancelDialog,
  onBookingClick
}: BookingDayDetailsDrawerProps) => {
  if (!selectedDate) return null;

  const formattedDate = format(selectedDate, "EEEE d MMMM yyyy", { locale: it });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-xl font-semibold capitalize">
              {formattedDate}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {bookings.length} {bookings.length === 1 ? 'prenotazione' : 'prenotazioni'}
          </p>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nessuna prenotazione per questo giorno
              </p>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={(e) => {
                    // Prevent click if targeting a button or interactive element
                    const target = e.target as HTMLElement;
                    const isInteractive = target.closest('button') || target.closest('a') || target.closest('[role="button"]');
                    if (!isInteractive && onBookingClick) {
                      onBookingClick(booking);
                    }
                  }}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                >
                  <EnhancedBookingCard
                    booking={booking}
                    userRole={getUserRole(booking)}
                    onOpenMessageDialog={onOpenMessageDialog}
                    onOpenCancelDialog={onOpenCancelDialog}
                    isChatEnabled={isChatEnabled(booking)}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
