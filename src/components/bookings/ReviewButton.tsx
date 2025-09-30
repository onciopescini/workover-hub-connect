
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { BookingWithDetails } from "@/types/booking";
import { getBookingReviewStatus } from "@/lib/booking-review-utils";
import { differenceInHours, differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

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
        sreLogger.error('Error checking review status', { bookingId: booking.id, targetUserId }, error as Error);
      } finally {
        setLoading(false);
      }
    };

    checkReviewStatus();
  }, [booking.id, targetUserId]);

  const checkReviewEligibility = () => {
    const bookingDate = parseISO(booking.booking_date);
    const hoursPassedSinceBooking = differenceInHours(new Date(), bookingDate);
    const daysSinceBooking = differenceInDays(new Date(), bookingDate);

    const isConfirmed = booking.status === 'confirmed';
    const isAfter24h = hoursPassedSinceBooking >= 24;
    const expired = daysSinceBooking > 14;
    const canReview = isConfirmed && isAfter24h && !expired;

    return {
      canReview,
      hoursUntilEligible: Math.max(0, 24 - hoursPassedSinceBooking),
      expired,
      daysUntilExpiry: Math.max(0, 14 - daysSinceBooking)
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
    setReviewStatus(prev => prev ? { ...prev, hasWrittenReview: true } : null);
    onReviewSubmitted?.();
  };

  if (!canReview) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center">
        {expired ? (
          <Clock className="w-4 h-4 mr-1" />
        ) : (
          <Clock className="w-4 h-4 mr-1" />
        )}
        {expired ? 'Finestra recensione scaduta' : `Recensione tra ${Math.ceil(hoursUntilEligible)}h`}
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recensione per {targetUserName}</DialogTitle>
          <DialogDescription>
            Condividi la tua esperienza con questo utente
          </DialogDescription>
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
