
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StarRating } from '@/components/ui/StarRating';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { BookingReviewWithDetails } from '@/types/review';
import { SpaceReviewWithDetails } from '@/types/space-review';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';
import { User, MessageSquare } from 'lucide-react';

// Union type to handle both Booking and Space reviews
export type GenericReview =
  | (BookingReviewWithDetails & { type: 'booking' })
  | (SpaceReviewWithDetails & { type: 'space' });

interface ReviewCardProps {
  review: GenericReview;
  showVisibility?: boolean;
  onRefresh?: () => void;
  variant?: 'compact' | 'full';
}

export function ReviewCard({ review, showVisibility = false, onRefresh, variant = 'full' }: ReviewCardProps) {
  // Normalize data access
  const authorName = review.type === 'booking'
    ? `${review.author?.first_name || ''} ${review.author?.last_name || ''}`.trim() || 'Utente'
    : `${review.author_first_name || ''} ${review.author_last_name || ''}`.trim() || 'Utente';

  const authorPhoto = review.type === 'booking'
    ? review.author?.profile_photo_url
    : review.author_profile_photo_url;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const targetName = review.type === 'booking'
    ? `${review.target?.first_name || ''} ${review.target?.last_name || ''}`.trim()
    : 'Space Review'; // Space reviews don't usually show target name in the same way

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");

  const handleSubmitReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }
      const { error } = await supabase.from('reports').insert({
        target_type: review.type === 'booking' ? 'booking_review' : 'space_review', // Ensure 'space_review' is valid enum in DB or handled
        target_id: review.id,
        reason: reportReason || 'Altro',
        description: reportDescription || null,
        reporter_id: user.id,
      });
      if (error) throw error;
      toast.success('Segnalazione inviata');
      setReportOpen(false);
      setReportReason("");
      setReportDescription("");
    } catch (e) {
      sreLogger.error('Error submitting review report', { reviewId: review.id }, e as Error);
      toast.error('Errore durante l\'invio della segnalazione');
    }
  };

  // Visibility logic (if needed for moderation)
  const isVisible = review.is_visible !== false; // Default true if null/undefined

  return (
    <Card className={`${!isVisible ? 'opacity-60 border-dashed' : ''} h-full`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorPhoto || undefined} />
            <AvatarFallback>
              {getInitials(authorName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-900">
                  {authorName}
                </p>
                {review.type === 'booking' && targetName && (
                  <p className="text-xs text-gray-500">
                    per {targetName}
                  </p>
                )}
              </div>
              
              <StarRating rating={review.rating} readOnly size="sm" />
            </div>
            
            {review.content && (
              <p className={`text-sm text-gray-700 mt-2 ${variant === 'compact' ? 'line-clamp-3' : ''}`}>
                {review.content}
              </p>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                {formatDistanceToNow(new Date(review.created_at ?? new Date()), { 
                  addSuffix: true, 
                  locale: it 
                })}
              </span>

              <div className="flex items-center gap-2">
                {showVisibility && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    isVisible
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isVisible ? 'Visibile' : 'Non visibile'}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setReportOpen(true)}>
                  Segnala
                </Button>
              </div>
            </div>

            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Segnala recensione</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    value={reportReason} 
                    onChange={(e) => setReportReason(e.target.value)} 
                    placeholder="Motivo" 
                    className="w-full border rounded p-2 text-sm"
                    aria-label="Motivo della segnalazione"
                  />
                  <textarea 
                    value={reportDescription || ''} 
                    onChange={(e) => setReportDescription(e.target.value)} 
                    placeholder="Descrizione (opzionale)" 
                    className="w-full border rounded p-2 text-sm" 
                    rows={4}
                    aria-label="Descrizione della segnalazione"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>Annulla</Button>
                    <Button size="sm" onClick={handleSubmitReport}>Invia</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
