
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, User, ArrowLeft } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';
import { getBookingReviews, getUserAverageRating } from "@/lib/booking-review-utils";
import type { BookingReviewWithDetails } from "@/types/review";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Caricamento...</h2>
      <p className="text-gray-600">Stiamo caricando le tue recensioni.</p>
    </div>
  </div>
);

export default function Reviews() {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [reviews, setReviews] = useState<{
    given: BookingReviewWithDetails[];
    received: BookingReviewWithDetails[];
  }>({ given: [], received: [] });
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    if (!authState.user) return;

    try {
      setIsLoading(true);
      const [reviewsData, avgRating] = await Promise.all([
        getBookingReviews(authState.user.id),
        getUserAverageRating(authState.user.id)
      ]);
      
      setReviews(reviewsData);
      setAverageRating(avgRating);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [authState.user]);
  useEffect(() => { document.title = 'Le mie recensioni | Reviews'; }, []);
  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${
          i < rating 
            ? 'fill-[#22C55E] text-[#22C55E]' 
            : 'text-gray-300'
        }`} 
      />
    ));
  };

  const getOtherPartyInfo = (review: BookingReviewWithDetails, type: 'given' | 'received') => {
    if (type === 'given') {
      return {
        name: `${review.target?.first_name || ''} ${review.target?.last_name || ''}`.trim() || 'Utente',
        photo: review.target?.profile_photo_url,
        role: "Utente"
      };
    } else {
      return {
        name: `${review.author?.first_name || ''} ${review.author?.last_name || ''}`.trim() || 'Utente',
        photo: review.author?.profile_photo_url,
        role: "Utente"
      };
    }
  };

  const ReviewCard = ({ review, type, onChanged }: { review: BookingReviewWithDetails; type: 'given' | 'received'; onChanged: () => void }) => {
    const otherParty = getOtherPartyInfo(review, type);
    const [editOpen, setEditOpen] = useState(false);
    const [editContent, setEditContent] = useState<string>(review.content || '');
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDescription, setReportDescription] = useState('');

    const canEdit = type === 'given' && review.created_at
      ? differenceInMinutes(new Date(), new Date(review.created_at)) < 60
      : false;

    const handleDelete = async () => {
      try {
        const { error } = await supabase
          .from('booking_reviews')
          .delete()
          .eq('id', review.id);
        if (error) throw error;
        toast.success('Recensione eliminata');
        onChanged();
      } catch (e) {
        console.error(e);
        toast.error('Errore nell\'eliminazione');
      }
    };

    const handleEditSave = async () => {
      try {
        const { error } = await supabase
          .from('booking_reviews')
          .update({ content: editContent })
          .eq('id', review.id);
        if (error) throw error;
        toast.success('Recensione aggiornata');
        setEditOpen(false);
        onChanged();
      } catch (e) {
        console.error(e);
        toast.error('Errore nell\'aggiornamento');
      }
    };

    const handleReport = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Devi essere autenticato');
          return;
        }
        const { error } = await supabase
          .from('reports')
          .insert({
            target_type: 'booking_review',
            target_id: review.id,
            reporter_id: user.id,
            reason: reportReason || 'Altro',
            description: reportDescription || null,
          });
        if (error) throw error;
        toast.success('Segnalazione inviata');
        setReportOpen(false);
        setReportReason('');
        setReportDescription('');
      } catch (e) {
        console.error(e);
        toast.error('Errore durante la segnalazione');
      }
    };

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParty.photo || undefined} />
              <AvatarFallback>
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {otherParty.name}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {otherParty.role}
                  </Badge>
                </div>
                <div className="flex items-center space-x-1">
                  {renderStars(review.rating)}
                </div>
              </div>
              
              <div className="mt-1">
                <p className="text-xs text-gray-600">
                  {review.booking?.space?.title}
                </p>
                <p className="text-xs text-gray-500">
                  {review.booking?.booking_date && 
                    formatDistanceToNow(new Date(review.booking.booking_date), { 
                      addSuffix: true, 
                      locale: it 
                    })}
                </p>
              </div>
              
              {review.content && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                  {review.content}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <Badge variant={type === 'given' ? 'default' : 'secondary'} className="text-xs">
                  {type === 'given' ? 'Scritta da me' : 'Ricevuta'}
                </Badge>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditOpen(true)}>
                        Modifica
                      </Button>
                      <Button variant="destructive" size="sm" className="text-xs" onClick={handleDelete}>
                        Elimina
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setReportOpen(true)}>
                    Segnala
                  </Button>
                </div>
              </div>

              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Modifica recensione</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      rows={4}
                      aria-label="Contenuto recensione"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Annulla</Button>
                      <Button size="sm" onClick={handleEditSave}>Salva</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

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
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Descrizione (opzionale)"
                      className="w-full border rounded p-2 text-sm"
                      rows={4}
                      aria-label="Descrizione della segnalazione"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>Annulla</Button>
                      <Button size="sm" onClick={handleReport}>Invia</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ type }: { type: 'given' | 'received' }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {type === 'given' ? 'Nessuna recensione scritta' : 'Nessuna recensione ricevuta'}
      </h3>
      <p className="text-gray-600 text-center mb-4">
        {type === 'given' 
          ? 'Non hai ancora scritto recensioni. Completa una prenotazione per poter lasciare una recensione.' 
          : 'Non hai ancora ricevuto recensioni. Completa più prenotazioni per ricevere feedback dai tuoi ospiti.'}
      </p>
      <Button 
        variant="outline" 
        onClick={() => navigate('/dashboard')}
        className="text-sm"
      >
        Vai al Dashboard
      </Button>
    </div>
  );

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Le mie recensioni</h1>
              <p className="text-sm text-gray-600">Gestisci le tue recensioni e feedback</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      {averageRating && (
        <div className="p-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Media voti ricevuti</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center space-x-1">
                      {renderStars(Math.round(averageRating))}
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Totale recensioni</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {reviews.received.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="received" className="text-sm">
              Ricevute ({reviews.received.length})
            </TabsTrigger>
            <TabsTrigger value="given" className="text-sm">
              Date ({reviews.given.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="received" className="space-y-0">
            {reviews.received.length === 0 ? (
              <EmptyState type="received" />
            ) : (
              reviews.received.map((review) => (
                <ReviewCard key={review.id} review={review} type="received" onChanged={fetchReviews} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="given" className="space-y-0">
            {reviews.given.length === 0 ? (
              <EmptyState type="given" />
            ) : (
              reviews.given.map((review) => (
                <ReviewCard key={review.id} review={review} type="given" onChanged={fetchReviews} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
