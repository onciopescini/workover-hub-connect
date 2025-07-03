
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { BookingReviewWithDetails, EventReviewWithDetails } from '@/types/review';

interface ReviewCardProps {
  review: BookingReviewWithDetails | EventReviewWithDetails;
  type: 'booking' | 'event';
  showVisibility?: boolean;
}

export function ReviewCard({ review, type, showVisibility = false }: ReviewCardProps) {
  const author = review.author;
  const target = review.target;
  
  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
              
              {showVisibility && (
                <span className={`text-xs px-2 py-1 rounded ${
                  review.is_visible 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {review.is_visible ? 'Visibile' : 'Non visibile'}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
