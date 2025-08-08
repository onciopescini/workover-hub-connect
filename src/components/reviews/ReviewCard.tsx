
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { BookingReviewWithDetails } from '@/types/review';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReviewCardProps {
  review: BookingReviewWithDetails;
  type: 'booking';
  showVisibility?: boolean;
}

export function ReviewCard({ review, type, showVisibility = false }: ReviewCardProps) {
  const author = review.author;
  const target = review.target;
  
  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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
        target_type: 'booking_review',
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
      console.error(e);
      toast.error('Errore durante l\'invio della segnalazione');
    }
  };

  return (
    <Card className={`${!review.is_visible ? 'opacity-60 border-dashed' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={author?.profile_photo_url || undefined} />
            <AvatarFallback>
              {getInitials(author?.first_name, author?.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {author?.first_name} {author?.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  per {target?.first_name} {target?.last_name}
                </p>
              </div>
              
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${
                      i < review.rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
            </div>
            
            {review.content && (
              <p className="text-sm text-gray-700 mt-2">
                {review.content}
              </p>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(review.created_at ?? new Date()), { 
                  addSuffix: true, 
                  locale: it 
                })}
              </span>
              <div className="flex items-center gap-2">
                {showVisibility && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    review.is_visible 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {review.is_visible ? 'Visibile' : 'Non visibile'}
                  </span>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setReportOpen(true)}>
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
