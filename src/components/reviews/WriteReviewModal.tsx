import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from '@/components/ui/StarRating';
import { ReviewFormSchema, ReviewFormData } from '@/schemas/reviewSchema';
import { addSpaceReview } from '@/lib/space-review-service';
import { Loader2 } from 'lucide-react';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  spaceId: string;
  authorId: string;
  spaceName: string;
  onSuccess?: () => void;
}

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  spaceId,
  authorId,
  spaceName,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: {
      rating: 0,
      content: '',
    },
  });

  const handleClose = () => {
    reset();
    setRating(0);
    onClose();
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (rating === 0) {
      return; // Rating is required
    }

    setIsSubmitting(true);

    try {
      const success = await addSpaceReview({
        booking_id: bookingId,
        space_id: spaceId,
        author_id: authorId,
        rating: rating,
        content: data.content || null,
      });

      if (success) {
        handleClose();
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lascia una recensione</DialogTitle>
          <DialogDescription>
            Condividi la tua esperienza presso {spaceName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Rating Input */}
          <div className="space-y-2">
            <Label>La tua valutazione *</Label>
            <div className="flex justify-center py-2">
              <StarRating
                rating={rating}
                size="lg"
                readOnly={false}
                onRatingChange={setRating}
              />
            </div>
            {rating === 0 && (
              <p className="text-sm text-destructive text-center">
                Seleziona almeno una stella
              </p>
            )}
          </div>

          {/* Comment Input */}
          <div className="space-y-2">
            <Label htmlFor="content">Il tuo commento (opzionale)</Label>
            <Textarea
              id="content"
              placeholder="Racconta la tua esperienza..."
              className="min-h-[100px] resize-none"
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Massimo 500 caratteri
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                'Invia recensione'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
