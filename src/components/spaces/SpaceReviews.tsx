
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Filter, ThumbsUp } from "lucide-react";
import { Review, calculateAverageRating } from "@/lib/review-utils";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SpaceReviewsProps {
  spaceId: string;
  reviews: Review[];
}

export function SpaceReviews({ spaceId, reviews }: SpaceReviewsProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  
  const averageRating = calculateAverageRating(reviews);
  const visibleReviews = reviews.filter(review => review.is_visible !== false);
  
  // Filter by rating if selected
  const filteredReviews = selectedRating 
    ? visibleReviews.filter(review => review.rating === selectedRating)
    : visibleReviews;
    
  const reviewsToShow = showAllReviews ? filteredReviews : filteredReviews.slice(0, 6);

  // Calculate rating distribution
  const ratingDistribution = Array.from({ length: 5 }, (_, i) => {
    const rating = 5 - i;
    const count = visibleReviews.filter(r => r.rating === rating).length;
    const percentage = visibleReviews.length > 0 ? (count / visibleReviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
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
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nessuna recensione ancora
            </h3>
            <p className="text-gray-600">
              Questo spazio non ha ancora ricevuto recensioni. Sii il primo a lasciarne una!
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
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
          {/* Overall Rating */}
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(averageRating), 'lg')}
            </div>
            <p className="text-gray-600">su {visibleReviews.length} recensioni</p>
          </div>
          
          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div 
                key={rating} 
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
              >
                <span className="text-sm w-6">{rating}</span>
                {renderStars(rating, 'sm')}
                <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Controls */}
        {selectedRating && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {selectedRating} stelle ({filteredReviews.length})
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedRating(null)}
            >
              Rimuovi filtro
            </Button>
          </div>
        )}

        {/* Reviews List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviewsToShow.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {(review.author_id || review.reviewer_id).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">Ospite verificato</span>
                    <Badge variant="outline" className="text-xs">
                      <ThumbsUp className="w-2 h-2 mr-1" />
                      Verificato
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(review.rating, 'sm')}
                    <span className="text-xs text-gray-500">
                      {format(new Date(review.created_at), 'MMM yyyy', { locale: it })}
                    </span>
                  </div>
                </div>
              </div>
              
              {(review.content || review.comment) && (
                <p className="text-gray-700 text-sm leading-relaxed">
                  {review.content || review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
        
        {/* Show More Button */}
        {filteredReviews.length > 6 && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="min-w-48"
            >
              {showAllReviews 
                ? `Mostra meno recensioni` 
                : `Mostra tutte le ${filteredReviews.length} recensioni`
              }
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
