
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { MapPin, Calendar, Clock, User, CreditCard } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BookingDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any; // Using any for flexibility with joined data, could be stricter
}

export const BookingDetailDialog = ({ isOpen, onClose, booking }: BookingDetailDialogProps) => {
  if (!booking) return null;

  const space = booking.space || {};
  const statusLabels: Record<string, string> = {
    pending: 'In attesa',
    confirmed: 'Confermata',
    cancelled: 'Cancellata',
    rejected: 'Rifiutata'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dettagli Prenotazione</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex justify-between items-center">
             <span className="text-sm text-muted-foreground">Stato</span>
             <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
               {statusLabels[booking.status] || booking.status}
             </Badge>
          </div>

          <Separator />

          {/* Space Info */}
          <div className="flex gap-4">
             {space.images?.[0] && (
               <img
                 src={space.images[0]}
                 alt={space.name}
                 className="w-20 h-20 rounded-lg object-cover"
               />
             )}
             <div>
               <h3 className="font-semibold">{space.name}</h3>
               <div className="flex items-center text-sm text-muted-foreground mt-1">
                 <MapPin className="w-3 h-3 mr-1" />
                 {space.city || space.address}
               </div>
             </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                Data
              </div>
              <div className="text-sm">
                {booking.booking_date ? format(new Date(booking.booking_date), 'dd MMM yyyy', { locale: it }) : '-'}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Clock className="w-4 h-4 text-primary" />
                Orario
              </div>
              <div className="text-sm">
                 {/* Assuming standard fields, adjust if necessary */}
                 {booking.start_time || '09:00'} - {booking.end_time || '18:00'}
              </div>
            </div>
          </div>

          {/* People */}
          <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-2">
               <User className="w-4 h-4 text-muted-foreground" />
               <span>Ospiti</span>
             </div>
             <span className="font-medium">{booking.guests_count || 1} persone</span>
          </div>

          {/* Payment Info (Simplified) */}
          <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-2">
               <CreditCard className="w-4 h-4 text-muted-foreground" />
               <span>Prezzo Totale</span>
             </div>
             <span className="font-medium">€ {booking.total_price || booking.total_amount || '-'}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
