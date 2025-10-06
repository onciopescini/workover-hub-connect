import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookingWithDetails } from '@/types/booking';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/types/booking';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { MessageSquare, XCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyBookingsState } from '../EmptyBookingsState';

interface BookingsTableViewProps {
  bookings: BookingWithDetails[];
  isLoading: boolean;
  getUserRole: (booking: BookingWithDetails) => 'host' | 'coworker';
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  activeTab?: 'all' | 'pending' | 'confirmed' | 'cancelled';
}

export const BookingsTableView: React.FC<BookingsTableViewProps> = ({
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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Spazio</TableHead>
            <TableHead>Coworker/Host</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Orario</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const userRole = getUserRole(booking);
            const isPast = booking.booking_date && new Date(booking.booking_date) < new Date();
            const canCancel = (booking.status === 'confirmed' || booking.status === 'pending') && !isPast;

            return (
              <TableRow key={booking.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {booking.space?.title || 'N/A'}
                </TableCell>
                <TableCell>
                  {userRole === 'host' 
                    ? `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`.trim()
                    : booking.space?.title || 'N/A'
                  }
                </TableCell>
                <TableCell>
                  {booking.booking_date 
                    ? format(new Date(booking.booking_date), 'dd MMM yyyy', { locale: it })
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  {booking.start_time && booking.end_time 
                    ? `${booking.start_time} - ${booking.end_time}`
                    : 'Tutto il giorno'
                  }
                </TableCell>
                <TableCell>
                  <Badge variant={BOOKING_STATUS_COLORS[booking.status] as any}>
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isChatEnabled(booking) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenMessageDialog(booking.id, booking.space?.title || 'Spazio')}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenCancelDialog(booking)}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
