import React from 'react';
import { BookingWithDetails } from "@/types/booking";
import { BookingCardDisplayData } from '@/types/bookings/bookings-ui.types';
import { BookingCardActions as ActionsType } from '@/types/bookings/bookings-actions.types';
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { ReviewButton } from "../ReviewButton";

interface BookingCardActionsProps {
  booking: BookingWithDetails;
  displayData: BookingCardDisplayData;
  actions: ActionsType;
}

export const BookingCardActions = ({ booking, displayData, actions }: BookingCardActionsProps) => {
  const { canCancel, showReviewButton, otherParty } = displayData;

  return (
    <CardContent className="pt-0">
      <div className="flex flex-wrap gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center"
          onClick={actions.onMessage}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Messaggi
        </Button>
        
        {showReviewButton && otherParty.id && (
          <ReviewButton
            booking={booking}
            targetUserId={otherParty.id}
            targetUserName={otherParty.name}
          />
        )}
        
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            className="flex items-center"
            onClick={actions.onCancel}
          >
            <X className="w-4 h-4 mr-1" />
            Cancella
          </Button>
        )}
      </div>
    </CardContent>
  );
};