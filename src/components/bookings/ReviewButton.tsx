
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { SpaceReviewForm } from "@/components/reviews/SpaceReviewForm";
import { BookingWithDetails } from "@/types/booking";
import { getBookingReviewStatus } from "@/lib/booking-review-utils";
import { getSpaceReviewStatus } from "@/lib/space-review-service";
import { differenceInDays, isBefore, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

interface ReviewButtonProps {
  booking: BookingWithDetails;
  reviewType: 'space' | 'coworker';
  targetId: string;
  targetName: string;
  onReviewSubmitted?: () => void;
}

export const ReviewButton = ({ booking, reviewType, targetId, targetName, onReviewSubmitted }: ReviewButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkReviewStatus = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const status = reviewType === 'coworker' 
          ? await getBookingReviewStatus(booking.id, user.id, targetId)
          : await getSpaceReviewStatus(booking.id, user.id);
        setReviewStatus(status);
      } catch (error) {
        sreLogger.error('Error checking review status', { bookingId: booking.id, targetId }, error as Error);
      } finally {
        setLoading(false);
      }
    };

    if (booking.id) {
        checkReviewStatus();
    }
  }, [booking.id, targetId, reviewType]);

  const checkReviewEligibility = () => {
    // 1. Check if "Served"
    if (booking.status === 'served') {
      return { canReview: true, expired: false, daysUntilExpiry: 14 }; // Approximate days until expiry since we don't track exact served date here
    }

    // 2. Check if "Confirmed" or "Checked In" AND Ended
    if (['confirmed', 'checked_in'].includes(booking.status || '')) {
      let endTime: Date | null = null;
      if (booking.service_completed_at) {
        endTime = new Date(booking.service_completed_at);
      } else if (booking.booking_date && booking.end_time) {
        endTime = parseISO(`${booking.booking_date}T${booking.end_time}`);
      }

      if (endTime && isBefore(endTime, new Date())) {
         return { canReview: true, expired: false, daysUntilExpiry: 14 };
      }
    }

    // Default: Not eligible
    return { canReview: false, expired: false, daysUntilExpiry: 0 };
  };

  const { canReview, expired } = checkReviewEligibility();

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center">
        <Star className="w-4 h-4 mr-1" />
        Caricamento...
      </Button>
    );
  }

  // Se ha già scritto una recensione, mostra il messaggio
  if (reviewStatus?.hasWrittenReview) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center">
        <CheckCircle className="w-4 h-4 mr-1" />
        Recensione Inviata
      </Button>
    );
  }

  const handleReviewSuccess = () => {
    setDialogOpen(false);
    setReviewStatus((prev: any) => prev ? { ...prev, hasWrittenReview: true } : null);
    onReviewSubmitted?.();
  };

  // Explicitly handle all non-eligible cases to avoid fallthrough
  if (!canReview) {
    if (expired) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Finestra scaduta
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>La finestra per recensire è scaduta (14 giorni dopo il servizio)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Default case for !canReview (e.g. status != served and not ended)
    // Only show "In attesa" if status is confirmed/checked_in but not ended, OR served/paid
    // Actually, if we are here, it means it's not served AND (not confirmed/checked_in OR not ended).
    // The requirement is to SHOW the button for confirmed/checked_in/served.
    // If it is PENDING or CANCELLED, maybe we shouldn't even render the button?
    // But the component is rendered inside EnhancedBookingCard which decides to show/hide it.
    // Let's refine `EnhancedBookingCard` to only render this button if status is relevant.

    // For now, if we are here, it means we rendered the button but it's disabled.
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              In attesa completamento
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Puoi recensire dopo che il servizio è stato completato</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center">
          <Star className="w-4 h-4 mr-1" />
          Lascia Recensione
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{reviewType === 'space' ? 'Recensisci lo Spazio' : `Recensione per ${targetName}`}</DialogTitle>
          <DialogDescription>
            {reviewType === 'space' ? 'Condividi la tua esperienza' : 'Lascia un feedback per questo utente'}
          </DialogDescription>
        </DialogHeader>
        {reviewType === 'space' ? (
          <SpaceReviewForm
            bookingId={booking.id}
            spaceId={targetId}
            spaceName={targetName}
            onSuccess={handleReviewSuccess}
          />
        ) : (
          <ReviewForm
            type="booking"
            bookingId={booking.id}
            targetId={targetId}
            targetName={targetName}
            onSuccess={handleReviewSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
