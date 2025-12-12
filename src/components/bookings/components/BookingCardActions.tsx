import React from 'react';
import { BookingWithDetails } from "@/types/booking";
import { BookingCardDisplayData } from '@/types/bookings/bookings-ui.types';
import { BookingCardActions as ActionsType } from '@/types/bookings/bookings-actions.types';
import { MessageSquare, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { ReviewButton } from "../ReviewButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BookingCardActionsProps {
  booking: BookingWithDetails;
  displayData: BookingCardDisplayData;
  actions: ActionsType;
  userRole?: 'host' | 'coworker';
}

export const BookingCardActions = ({ booking, displayData, actions, userRole = 'coworker' }: BookingCardActionsProps) => {
  const { canCancel, showReviewButton, otherParty } = displayData;

  // Show Pay button for pending_payment or pending with slot reservation
  const showPayButton = booking.status === 'pending_payment' || 
    (booking.status === 'pending' && booking.slot_reserved_until);

  const handlePayNow = async () => {
    try {
      // Validate host connection status
      const { data: spaceData, error: spaceError } = await supabase
        .from('workspaces')
        .select('profiles(stripe_connected)')
        .eq('id', booking.space_id)
        .single();
      
      // Strict validation: check for explicit true on stripe_connected
      if (spaceError || !spaceData?.profiles?.stripe_connected) {
        toast.error('Host non collegato a Stripe');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-v3', {
        body: {
          booking_id: booking.id,
          origin: window.location.origin
        },
      });

      if (error || !data?.url) {
        toast.error('Errore nella creazione della sessione di pagamento');
        return;
      }

      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error in handlePayNow:', error);
      toast.error('Errore nel processo di pagamento');
    }
  };

  return (
    <CardContent className="pt-0">
      <div className="flex flex-wrap gap-2 mt-4">
        {showPayButton && (
          <Button
            variant="default"
            size="sm"
            className="flex items-center bg-green-600 hover:bg-green-700"
            onClick={handlePayNow}
          >
            <CreditCard className="w-4 h-4 mr-1" />
            Paga ora
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="flex items-center"
          onClick={actions.onMessage}
        >
          <MessageSquare className="w-4 h-4 mr-1" />
          Messaggi
        </Button>
        
        {showReviewButton && (
          userRole === 'host' ? (
            // Host reviews coworker
            otherParty.id && (
              <ReviewButton
                booking={booking}
                reviewType="coworker"
                targetId={otherParty.id}
                targetName={otherParty.name}
              />
            )
          ) : (
            // Coworker reviews space
            booking.space_id && (
              <ReviewButton
                booking={booking}
                reviewType="space"
                targetId={booking.space_id}
                targetName={booking.space?.title || "Spazio"}
              />
            )
          )
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
