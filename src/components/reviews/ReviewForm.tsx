
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { addBookingReview } from '@/lib/booking-review-utils';
import { ReviewFormSchema, ReviewFormData } from '@/schemas/reviewSchema';
import { useLogger } from '@/hooks/useLogger';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/components/ui/StarRating';

interface ReviewFormProps {
  type: 'booking';
  bookingId: string;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

export function ReviewForm({
  type, 
  bookingId, 
  targetId, 
  targetName, 
  onSuccess 
}: ReviewFormProps) {
  const { error } = useLogger({ context: 'ReviewForm' });

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: {
      rating: 0,
      content: ""
    }
  });

  const onSubmit = async (data: ReviewFormData) => {
    try {
      // Get authenticated user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        error('User not authenticated', new Error('No authenticated user'), { operation: 'get_user' });
        return;
      }

      const success = await addBookingReview({
        booking_id: bookingId,
        target_id: targetId,
        rating: data.rating,
        content: data.content || null,
        author_id: userData.user.id,
      });
      
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
        bookingId
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
                    <StarRating
                      rating={field.value}
                      onRatingChange={field.onChange}
                      size="xl"
                    />
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
