import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Star, MessageSquare, User, Calendar } from "lucide-react";
import { getUserReviews } from "@/lib/review-utils";
import { ReviewWithDetails } from "@/types/review";
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

const BidirectionalReviews = () => {
  const { authState } = useAuth();
  const [receivedReviews, setReceivedReviews] = useState<ReviewWithDetails[]>([]);
  const [givenReviews, setGivenReviews] = useState<ReviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true);
      if (authState.user) {
        const reviews = await getUserReviews(authState.user.id);
        setReceivedReviews(reviews.received);
        setGivenReviews(reviews.given);
      }
      setIsLoading(false);
    };

    loadReviews();
  }, [authState.user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Le tue Recensioni</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recensioni Ricevute */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recensioni Ricevute</CardTitle>
            </CardHeader>
            <CardContent>
              {receivedReviews.length === 0 ? (
                <p>Nessuna recensione ricevuta.</p>
              ) : (
                <div className="space-y-4">
                  {receivedReviews.map((review) => (
                    <div key={review.id} className="border rounded-md p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{review.rating}</span>
                      </div>
                      <p className="text-sm">{review.comment}</p>
                      <div className="flex items-center space-x-2 mt-2 text-gray-500 text-xs">
                        <User className="h-3 w-3" />
                        <span>Da: {review.reviewer?.first_name} {review.reviewer?.last_name}</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: it })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recensioni Date */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recensioni Date</CardTitle>
            </CardHeader>
            <CardContent>
              {givenReviews.length === 0 ? (
                <p>Nessuna recensione data.</p>
              ) : (
                <div className="space-y-4">
                  {givenReviews.map((review) => (
                    <div key={review.id} className="border rounded-md p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{review.rating}</span>
                      </div>
                      <p className="text-sm">{review.comment}</p>
                       <div className="flex items-center space-x-2 mt-2 text-gray-500 text-xs">
                        <User className="h-3 w-3" />
                        <span>A: {review.reviewee?.first_name} {review.reviewee?.last_name}</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: it })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BidirectionalReviews;
