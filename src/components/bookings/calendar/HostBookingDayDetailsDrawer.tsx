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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, Building2 } from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';
import { EnhancedBookingCard } from '../EnhancedBookingCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { groupBookingsBySpace } from './utils/hostCalendarHelpers';
import { Separator } from '@/components/ui/separator';

interface HostBookingDayDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  bookings: BookingWithDetails[];
  getUserRole: (booking: BookingWithDetails) => "host" | "coworker";
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  viewMode: 'all' | 'single';
  onBookingClick?: (booking: BookingWithDetails) => void;
}

export const HostBookingDayDetailsDrawer = ({
  open,
  onOpenChange,
  selectedDate,
  bookings,
  getUserRole,
  isChatEnabled,
  onOpenMessageDialog,
  onOpenCancelDialog,
  viewMode,
  onBookingClick
}: HostBookingDayDetailsDrawerProps) => {
  if (!selectedDate) return null;

  const formattedDate = format(selectedDate, "EEEE d MMMM yyyy", { locale: it });
  const groupedBySpace = groupBookingsBySpace(bookings);

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
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>
              {bookings.length} {bookings.length === 1 ? 'prenotazione' : 'prenotazioni'}
            </span>
            {viewMode === 'all' && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <span>
                  {groupedBySpace.size} {groupedBySpace.size === 1 ? 'spazio' : 'spazi'}
                </span>
              </>
            )}
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          {bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessuna prenotazione per questo giorno
            </p>
          ) : viewMode === 'all' ? (
            // Vista "Tutti gli spazi" - raggruppato per spazio
            <div className="space-y-6">
              {Array.from(groupedBySpace.values()).map(({ space, bookings: spaceBookings }) => (
                <Card key={space.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      {space.title}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({spaceBookings.length} {spaceBookings.length === 1 ? 'prenotazione' : 'prenotazioni'})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {spaceBookings.map((booking) => (
                      <div
                        key={booking.id}
                        onClick={(e) => {
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
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Vista "Spazio singolo" - lista semplice
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={(e) => {
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
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
