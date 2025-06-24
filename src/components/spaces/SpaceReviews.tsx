
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare } from "lucide-react";
import { Review, calculateAverageRating } from "@/lib/review-utils";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SpaceReviewsProps {
  spaceId: string;
  reviews: Review[];
}

export function SpaceReviews({ spaceId, reviews }: SpaceReviewsProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  const averageRating = calculateAverageRating(reviews);
  const visibleReviews = reviews.filter(review => review.is_visible !== false);
  const reviewsToShow = showAllReviews ? visibleReviews : visibleReviews.slice(0, 3);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (visibleReviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Recensioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessuna recensione
            </h3>
            <p className="text-gray-600">
              Questo spazio non ha ancora ricevuto recensioni.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Recensioni ({visibleReviews.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          {renderStars(Math.round(averageRating))}
          <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
          <span className="text-gray-500">su 5</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviewsToShow.map((review) => (
          <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback>
                  {(review.author_id || review.reviewer_id).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {renderStars(review.rating)}
                  <span className="text-sm text-gray-500">
                    {format(new Date(review.created_at), 'dd MMM yyyy', { locale: it })}
                  </span>
                </div>
                {(review.content || review.comment) && (
                  <p className="text-gray-700 text-sm mt-2">
                    {review.content || review.comment}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {visibleReviews.length > 3 && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAllReviews(!showAllReviews)}
            >
              {showAllReviews 
                ? `Mostra meno recensioni` 
                : `Mostra tutte le ${visibleReviews.length} recensioni`
              }
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
