
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { BookingWithDetails } from "@/types/booking";
import { getBookingReviewStatus } from "@/lib/booking-review-utils";
import { differenceInHours, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ReviewButtonProps {
  booking: BookingWithDetails;
  targetUserId: string;
  targetUserName: string;
  onReviewSubmitted?: () => void;
}

export const ReviewButton = ({ booking, targetUserId, targetUserName, onReviewSubmitted }: ReviewButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<{
    canWriteReview: boolean;
    hasWrittenReview: boolean;
    isVisible: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkReviewStatus = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const status = await getBookingReviewStatus(booking.id, user.id, targetUserId);
        setReviewStatus(status);
      } catch (error) {
        console.error('Error checking review status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkReviewStatus();
  }, [booking.id, targetUserId]);

  const checkReviewEligibility = () => {
    const bookingDate = parseISO(booking.booking_date);
    const hoursPassedSinceBooking = differenceInHours(new Date(), bookingDate);
    
    // Deve essere passato almeno 24 ore dalla prenotazione
    const canReview = hoursPassedSinceBooking >= 24 && booking.status === 'confirmed';
    
    return {
      canReview,
      hoursUntilEligible: Math.max(0, 24 - hoursPassedSinceBooking)
    };
  };

  const { canReview, hoursUntilEligible } = checkReviewEligibility();

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
    setReviewStatus(prev => prev ? { ...prev, hasWrittenReview: true } : null);
    onReviewSubmitted?.();
  };

  if (!canReview) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center">
        <Clock className="w-4 h-4 mr-1" />
        Recensione tra {Math.ceil(hoursUntilEligible)}h
      </Button>
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
      <DialogContent className="max-w-md" aria-describedby="review-dialog-description">
        <DialogHeader>
          <DialogTitle>Recensione per {targetUserName}</DialogTitle>
          <p id="review-dialog-description" className="text-sm text-muted-foreground">
            Condividi la tua esperienza con questo utente
          </p>
        </DialogHeader>
        <ReviewForm
          type="booking"
          bookingId={booking.id}
          targetId={targetUserId}
          targetName={targetUserName}
          onSuccess={handleReviewSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};
