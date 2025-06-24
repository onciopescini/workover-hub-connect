import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Badge } from "@/components/ui/badge";

export default function Reviews() {
  const { authState } = useAuth();
  const [reviews, setReviews] = useState<{
    given: ReviewWithDetails[];
    received: ReviewWithDetails[];
  }>({ given: [], received: [] });
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!authState.user) return;

      try {
        setIsLoading(true);
        const [reviewsData, avgRating] = await Promise.all([
          getUserReviews(authState.user.id),
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

    fetchReviews();
  }, [authState.user]);

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

  const getOtherPartyInfo = (review: ReviewWithDetails, type: 'given' | 'received') => {
    if (type === 'given') {
      return {
        name: `${review.reviewee?.first_name} ${review.reviewee?.last_name}`,
        photo: review.reviewee?.profile_photo_url,
        role: review.reviewee ? "Coworker" : "Host"
      };
    } else {
      return {
        name: `${review.reviewer?.first_name} ${review.reviewer?.last_name}`,
        photo: review.reviewer?.profile_photo_url,
        role: review.reviewer ? "Coworker" : "Host"
      };
    }
  };

  const ReviewCard = ({ review, type }: { review: ReviewWithDetails; type: 'given' | 'received' }) => {
    const otherParty = getOtherPartyInfo(review, type);
    
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
              
              {review.comment && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                  {review.comment}
                </p>
              )}
              
              <div className="flex items-center justify-between mt-3">
                <Badge variant={type === 'given' ? 'default' : 'secondary'} className="text-xs">
                  {type === 'given' ? 'Scritta da me' : 'Ricevuta'}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(review.created_at!), { 
                    addSuffix: true, 
                    locale: it 
                  })}
                </span>
              </div>
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
                <ReviewCard key={review.id} review={review} type="received" />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="given" className="space-y-0">
            {reviews.given.length === 0 ? (
              <EmptyState type="given" />
            ) : (
              reviews.given.map((review) => (
                <ReviewCard key={review.id} review={review} type="given" />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
