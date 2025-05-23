
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getBookingReviews, getEventReviews } from '@/lib/bidirectional-review-utils';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { BookingReviewWithDetails, EventReviewWithDetails } from '@/types/review';
import { ArrowLeft, Star, MessageSquare, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BidirectionalReviews() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [bookingReviews, setBookingReviews] = useState<{
    given: BookingReviewWithDetails[];
    received: BookingReviewWithDetails[];
  }>({ given: [], received: [] });
  const [eventReviews, setEventReviews] = useState<{
    given: EventReviewWithDetails[];
    received: EventReviewWithDetails[];
  }>({ given: [], received: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.user?.id) {
      loadReviews();
    }
  }, [authState.user?.id]);

  const loadReviews = async () => {
    if (!authState.user?.id) return;
    
    setLoading(true);
    try {
      const [bookingData, eventData] = await Promise.all([
        getBookingReviews(authState.user.id),
        getEventReviews(authState.user.id)
      ]);
      
      setBookingReviews(bookingData);
      setEventReviews(eventData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const allGivenReviews = [...bookingReviews.given, ...eventReviews.given];
  const allReceivedReviews = [...bookingReviews.received, ...eventReviews.received];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
        </div>
        <div className="text-center">Caricamento recensioni...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Indietro
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">Le Mie Recensioni</h1>
          <p className="text-gray-600">
            Gestisci le recensioni date e ricevute
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="text-2xl font-bold">{allGivenReviews.length}</span>
            </div>
            <p className="text-sm text-gray-600">Recensioni Date</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <MessageSquare className="w-5 h-5 text-blue-500 mr-2" />
              <span className="text-2xl font-bold">{allReceivedReviews.length}</span>
            </div>
            <p className="text-sm text-gray-600">Recensioni Ricevute</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-2xl font-bold">{bookingReviews.given.length + bookingReviews.received.length}</span>
            </div>
            <p className="text-sm text-gray-600">Recensioni Spazi</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-purple-500 mr-2" />
              <span className="text-2xl font-bold">{eventReviews.given.length + eventReviews.received.length}</span>
            </div>
            <p className="text-sm text-gray-600">Recensioni Eventi</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="received" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            Recensioni Ricevute ({allReceivedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="given">
            Recensioni Date ({allGivenReviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-6">
          {allReceivedReviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna recensione ricevuta
                </h3>
                <p className="text-gray-600">
                  Le recensioni che riceverai appariranno qui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allReceivedReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  type={'booking_id' in review ? 'booking' : 'event'}
                  showVisibility={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="given" className="space-y-6">
          {allGivenReviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna recensione scritta
                </h3>
                <p className="text-gray-600">
                  Le recensioni che scriverai appariranno qui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allGivenReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  type={'booking_id' in review ? 'booking' : 'event'}
                  showVisibility={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
