
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
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/types/booking';

interface BookingDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any; // Using any for flexibility with joined data
}

export const BookingDetailDialog = ({ isOpen, onClose, booking }: BookingDetailDialogProps) => {
  if (!booking) return null;

  // Robustly handle both 'space' (from joined queries or prop injection) and 'workspaces' (raw DB join)
  const space = booking.space || booking.workspaces || {};

  // Status Badge Logic
  const statusColor = BOOKING_STATUS_COLORS[booking.status as keyof typeof BOOKING_STATUS_COLORS] || "bg-gray-100 text-gray-800";
  const statusLabel = BOOKING_STATUS_LABELS[booking.status as keyof typeof BOOKING_STATUS_LABELS] || booking.status;

  // Image Logic
  // Prefer `photos` array if available (from new join), fallback to `images` or `image_url`
  const imageUrl = space.photos?.[0] || space.images?.[0] || space.image_url;

  // Price Calculation Logic
  const formatPrice = (val: number) =>
    val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let priceDisplay = "-";

  if (booking.total_amount || booking.total_price) {
    const amount = booking.total_amount || booking.total_price;
    priceDisplay = `€ ${formatPrice(Number(amount))}`;
  } else if (space.price_per_hour && booking.start_time && booking.end_time) {
    // Fallback calculation: duration * price_per_hour
    try {
      const [startH, startM] = booking.start_time.split(':').map(Number);
      const [endH, endM] = booking.end_time.split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const durationHours = (endMinutes - startMinutes) / 60;

      if (durationHours > 0) {
        const estimatedPrice = durationHours * space.price_per_hour;
        priceDisplay = `€ ${formatPrice(estimatedPrice)}`;
      }
    } catch (e) {
      console.warn("Error calculating estimated price", e);
    }
  }

  // Address Logic
  const fullAddress = [space.address, space.city].filter(Boolean).join(", ") || "Indirizzo non disponibile";

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
             <Badge variant="outline" className={`${statusColor} border-0`}>
               {statusLabel}
             </Badge>
          </div>

          <Separator />

          {/* Space Info */}
          <div className="flex gap-4">
             {imageUrl ? (
               <img
                 src={imageUrl}
                 alt={space.name || space.title}
                 className="w-20 h-20 rounded-lg object-cover"
               />
             ) : (
               <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
                 <MapPin className="text-slate-400" />
               </div>
             )}
             <div>
               <h3 className="font-semibold">{space.name || space.title || "Spazio"}</h3>
               <div className="flex items-center text-sm text-muted-foreground mt-1">
                 <MapPin className="w-3 h-3 mr-1" />
                 {fullAddress}
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
                 {booking.start_time ? booking.start_time.substring(0, 5) : '09:00'} - {booking.end_time ? booking.end_time.substring(0, 5) : '18:00'}
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

          {/* Payment Info */}
          <div className="flex items-center justify-between text-sm">
             <div className="flex items-center gap-2">
               <CreditCard className="w-4 h-4 text-muted-foreground" />
               <span>Prezzo Totale</span>
             </div>
             <span className="font-medium">{priceDisplay}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
