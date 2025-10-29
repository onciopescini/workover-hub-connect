import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ReviewFormSchema, type ReviewFormData } from "@/schemas/reviewSchema";
import { addSpaceReview } from "@/lib/space-review-service";
import { supabase } from "@/integrations/supabase/client";

interface SpaceReviewFormProps {
  bookingId: string;
  spaceId: string;
  spaceName: string;
  onSuccess?: () => void;
}

export function SpaceReviewForm({ bookingId, spaceId, spaceName, onSuccess }: SpaceReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: {
      rating: 0,
      content: "",
    },
  });

  const selectedRating = form.watch("rating");

  const onSubmit = async (data: ReviewFormData) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const success = await addSpaceReview({
        booking_id: bookingId,
        space_id: spaceId,
        author_id: user.id,
        rating: data.rating,
        content: data.content,
      });

      if (success) {
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error submitting space review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Recensisci lo Spazio</h3>
            <p className="text-sm text-muted-foreground">{spaceName}</p>
          </div>

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valutazione *</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => field.onChange(rating)}
                        className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            rating <= selectedRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </FormControl>
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
                    {...field}
                    value={field.value || ""}
                    placeholder="Condividi la tua esperienza con questo spazio..."
                    className="min-h-[120px] resize-none"
                    maxLength={500}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <span className="text-xs text-muted-foreground">
                    {field.value?.length || 0}/500
                  </span>
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Invio in corso..." : "Invia Recensione"}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
