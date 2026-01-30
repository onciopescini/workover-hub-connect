import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import type { HostReview } from '@/hooks/queries/useHostReviews';
import { Link } from 'react-router-dom';

interface HostReviewsListProps {
  reviews: HostReview[];
  isLoading?: boolean;
}

export const HostReviewsList: React.FC<HostReviewsListProps> = ({ 
  reviews, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nessuna recensione ancora
      </p>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {reviews.slice(0, 5).map(review => (
        <div key={review.id} className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={review.reviewer_profile_photo_url || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(review.reviewer_first_name, review.reviewer_last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">
                {review.reviewer_first_name} {review.reviewer_last_name.charAt(0)}.
              </span>
              {renderStars(review.rating)}
            </div>
            
            <Link 
              to={`/spaces/${review.space_id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="w-3 h-3" />
              <span className="truncate">{review.space_title}</span>
            </Link>
            
            {review.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {review.content}
              </p>
            )}
            
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { 
                addSuffix: true, 
                locale: it 
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
