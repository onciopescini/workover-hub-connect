
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { addBookingReview, addEventReview } from '@/lib/bidirectional-review-utils';

interface ReviewFormProps {
  type: 'booking' | 'event';
  bookingId?: string;
  eventId?: string;
  targetId: string;
  targetName: string;
  onSuccess?: () => void;
}

export function ReviewForm({ type, bookingId, eventId, targetId, targetName, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      let success = false;
      
      if (type === 'booking' && bookingId) {
        success = await addBookingReview({
          booking_id: bookingId,
          target_id: targetId,
          rating,
          content: content.trim() || null,
          author_id: '', // Will be set by RLS
        });
      } else if (type === 'event' && eventId) {
        success = await addEventReview({
          event_id: eventId,
          target_id: targetId,
          rating,
          content: content.trim() || null,
          author_id: '', // Will be set by RLS
        });
      }
      
      if (success && onSuccess) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lascia una recensione per {targetName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Valutazione
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Commento (opzionale)
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Condividi la tua esperienza..."
              rows={4}
            />
          </div>

          <Button
            type="submit"
            disabled={rating === 0 || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Invio in corso...' : 'Invia recensione'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
