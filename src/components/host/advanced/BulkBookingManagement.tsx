
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MessageSquare, Download } from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';

interface BulkBookingManagementProps {
  bookings: BookingWithDetails[];
  onBulkAction: (action: string, bookingIds: string[]) => void;
  isLoading?: boolean;
}

export const BulkBookingManagement: React.FC<BulkBookingManagementProps> = ({
  bookings,
  onBulkAction,
  isLoading = false
}) => {
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  const handleSelectAll = () => {
    if (selectedBookings.length === bookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(bookings.map(b => b.id));
    }
  };

  const handleSelectBooking = (bookingId: string) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleBulkAction = () => {
    if (bulkAction && selectedBookings.length > 0) {
      onBulkAction(bulkAction, selectedBookings);
      setSelectedBookings([]);
      setBulkAction('');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'In attesa', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confermata', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Annullata', className: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Prenotazioni in Blocco</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bulk Actions Controls */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              checked={selectedBookings.length === bookings.length && bookings.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedBookings.length} di {bookings.length} selezionate
            </span>
            
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleziona azione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Approva tutte</SelectItem>
                <SelectItem value="reject">Rifiuta tutte</SelectItem>
                <SelectItem value="message">Invia messaggio</SelectItem>
                <SelectItem value="export">Esporta dati</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={handleBulkAction}
              disabled={!bulkAction || selectedBookings.length === 0 || isLoading}
              className="ml-auto"
            >
              {isLoading ? 'Elaborazione...' : 'Applica'}
            </Button>
          </div>

          {/* Bookings List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className={`p-3 rounded-lg border transition-colors ${
                  selectedBookings.includes(booking.id) ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedBookings.includes(booking.id)}
                    onCheckedChange={() => handleSelectBooking(booking.id)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium truncate">
                          {booking.space.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {booking.coworker?.first_name} {booking.coworker?.last_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {booking.booking_date}
                        </p>
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {bookings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Nessuna prenotazione disponibile</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
