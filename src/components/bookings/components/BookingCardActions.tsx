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
import { parseISO } from "date-fns";

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
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('price_per_hour, price_per_day, host_id, profiles(stripe_account_id)')
        .eq('id', booking.space_id)
        .single();
      
      if (spaceError || !spaceData?.profiles?.stripe_account_id) {
        toast.error('Host non collegato a Stripe');
        return;
      }

      // Calculate duration
      const startTime = parseISO(`${booking.booking_date}T${booking.start_time}`);
      const endTime = parseISO(`${booking.booking_date}T${booking.end_time}`);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      const { data, error } = await supabase.functions.invoke('create-payment-session', {
        body: {
          space_id: booking.space_id,
          durationHours,
          pricePerHour: spaceData.price_per_hour,
          pricePerDay: spaceData.price_per_day,
          host_stripe_account_id: spaceData.profiles.stripe_account_id,
          booking_id: booking.id,
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
        
        {showReviewButton && otherParty.id && (
          <ReviewButton
            booking={booking}
            reviewType={userRole === 'host' ? 'coworker' : 'space'}
            targetId={otherParty.id}
            targetName={otherParty.name}
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