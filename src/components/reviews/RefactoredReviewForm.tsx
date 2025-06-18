
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Star } from 'lucide-react';
import { addBookingReview, addEventReview } from '@/lib/bidirectional-review-utils';
import { ReviewFormSchema, ReviewFormData } from '@/schemas/reviewSchema';

interface RefactoredReviewFormProps {
  type: 'booking' | 'event';
  bookingId?: string;
  eventId?: string;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

export function RefactoredReviewForm({ 
  type, 
  bookingId, 
  eventId, 
  targetId, 
  targetName, 
  onSuccess 
}: RefactoredReviewFormProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: {
      rating: 0,
      content: ""
    }
  });

  const watchedRating = form.watch('rating');

  const onSubmit = async (data: ReviewFormData) => {
    try {
      let success = false;
      
      if (type === 'booking' && bookingId) {
        success = await addBookingReview({
          booking_id: bookingId,
          target_id: targetId,
          rating: data.rating,
          content: data.content,
          author_id: '', // Will be set by RLS
        });
      } else if (type === 'event' && eventId) {
        success = await addEventReview({
          event_id: eventId,
          target_id: targetId,
          rating: data.rating,
          content: data.content,
          author_id: '', // Will be set by RLS
        });
      }
      
      if (success && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lascia una recensione per {targetName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valutazione</FormLabel>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoveredRating || watchedRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commento (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Condividi la tua esperienza..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting ? 'Invio in corso...' : 'Invia recensione'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
