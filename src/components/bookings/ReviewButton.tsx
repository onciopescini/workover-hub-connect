
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { BookingWithDetails } from "@/types/booking";
import { getBookingReviewStatus } from "@/lib/bidirectional-review-utils";
import { differenceInHours, parseISO } from "date-fns";

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

  const handleReviewSuccess = () => {
    setDialogOpen(false);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recensione per {targetUserName}</DialogTitle>
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
