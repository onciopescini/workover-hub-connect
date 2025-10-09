import React from 'react';
import { BookingWithDetails } from "@/types/booking";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";

interface BookingCardHeaderProps {
  booking: BookingWithDetails;
  status: string;
}

export const BookingCardHeader = ({ booking, status }: BookingCardHeaderProps) => {
  const isUrgent = booking.is_urgent && (status === 'pending_approval' || status === 'pending_payment');
  
  return (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {booking.space?.title || 'Spazio senza titolo'}
          </CardTitle>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <MapPin className="w-4 h-4 mr-1" />
            {booking.space?.address || 'Indirizzo non disponibile'}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={BOOKING_STATUS_COLORS[status as keyof typeof BOOKING_STATUS_COLORS]}>
            {BOOKING_STATUS_LABELS[status as keyof typeof BOOKING_STATUS_LABELS]}
          </Badge>
          {isUrgent && status === 'pending_payment' && (
            <Badge className="bg-red-100 text-red-800 animate-pulse">
              ⏰ Paga entro 2h
            </Badge>
          )}
        </div>
      </div>
    </CardHeader>
  );
};