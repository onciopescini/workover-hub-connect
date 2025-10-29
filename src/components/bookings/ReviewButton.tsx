
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
import { differenceInHours, differenceInDays, parseISO } from "date-fns";
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

    checkReviewStatus();
  }, [booking.id, targetId, reviewType]);

  const checkReviewEligibility = () => {
    if (booking.status !== 'served' || !booking.service_completed_at) {
      return { canReview: false, hoursUntilEligible: 24, expired: false, daysUntilExpiry: 14 };
    }

    const completedAt = parseISO(booking.service_completed_at);
    const now = new Date();
    const hoursPassedSinceEnd = differenceInHours(now, completedAt);
    const daysSinceEnd = differenceInDays(now, completedAt);

    const isAfter24h = hoursPassedSinceEnd >= 24;
    const expired = daysSinceEnd > 14;
    const canReview = isAfter24h && !expired;

    return {
      canReview,
      hoursUntilEligible: Math.max(0, 24 - hoursPassedSinceEnd),
      expired,
      daysUntilExpiry: Math.max(0, 14 - daysSinceEnd)
    };
  };

  const { canReview, hoursUntilEligible, expired, daysUntilExpiry } = checkReviewEligibility();

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

  if (!canReview) {
    // ✅ Messaggi migliorati con tooltip
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

    if (booking.status !== 'served') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Servizio non completato
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Puoi recensire solo dopo che il servizio è stato completato</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Tra {Math.ceil(hoursUntilEligible)}h
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Potrai recensire 24 ore dopo la fine del servizio</p>
            <p className="text-xs text-muted-foreground mt-1">
              Hai {daysUntilExpiry} giorni per lasciare una recensione
            </p>
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
