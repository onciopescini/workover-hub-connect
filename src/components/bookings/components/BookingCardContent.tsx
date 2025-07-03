import React from 'react';
import { BookingWithDetails } from "@/types/booking";
import { BookingCardDisplayData, UserRole } from '@/types/bookings/bookings-ui.types';
import { Calendar, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardContent } from "@/components/ui/card";

interface BookingCardContentProps {
  booking: BookingWithDetails;
  displayData: BookingCardDisplayData;
  userRole: UserRole;
}

export const BookingCardContent = ({ booking, displayData, userRole }: BookingCardContentProps) => {
  const { otherParty, formattedDate } = displayData;

  return (
    <CardContent className="pt-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherParty.photo || undefined} />
            <AvatarFallback>
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900">{otherParty.name}</p>
            <p className="text-sm text-gray-600">{otherParty.role}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <Calendar className="w-4 h-4 mr-1" />
            {formattedDate}
          </div>
          {booking.start_time && booking.end_time && (
            <p className="text-xs text-gray-500">
              {booking.start_time} - {booking.end_time}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Tu sei: {userRole === "host" ? "Host" : "Coworker"}
          </p>
        </div>
      </div>
    </CardContent>
  );
};