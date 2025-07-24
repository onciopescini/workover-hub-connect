
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
import { useLogger } from '@/hooks/useLogger';
import { supabase } from '@/integrations/supabase/client';

interface ReviewFormProps {
  type: 'booking' | 'event';
  bookingId?: string;
  eventId?: string;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

export function ReviewForm({
  type, 
  bookingId, 
  eventId, 
  targetId, 
  targetName, 
  onSuccess 
}: ReviewFormProps) {
  const { error } = useLogger({ context: 'ReviewForm' });
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
      // Get authenticated user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        error('User not authenticated', new Error('No authenticated user'), { operation: 'get_user' });
        return;
      }

      let success = false;

      if (type === 'booking' && bookingId) {
        success = await addBookingReview({
          booking_id: bookingId,
          target_id: targetId,
          rating: data.rating,
          content: data.content || null,
          author_id: userData.user.id,
        });
      } else if (type === 'event' && eventId) {
        success = await addEventReview({
          event_id: eventId,
          target_id: targetId,
          rating: data.rating,
          content: data.content || null,
          author_id: userData.user.id,
        });
      }
      
      if (success) {
        form.reset();
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (submitError) {
      error('Error submitting review', submitError as Error, { 
        operation: 'submit_review',
        reviewType: type,
        targetId,
        bookingId,
        eventId
      });
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
                       value={field.value || ""}
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
