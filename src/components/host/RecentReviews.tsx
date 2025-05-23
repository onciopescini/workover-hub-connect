
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ReviewWithDetails } from "@/types/review";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface RecentReviewsProps {
  reviews: ReviewWithDetails[];
  averageRating: number | null;
}

export function RecentReviews({ reviews, averageRating }: RecentReviewsProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recensioni Recenti</CardTitle>
          {averageRating && (
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-[#22C55E] text-[#22C55E]" />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nessuna recensione ancora
          </p>
        ) : (
          reviews.slice(0, 5).map((review) => (
            <div key={review.id} className="p-3 rounded-lg border">
              <div className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={review.reviewer?.profile_photo_url || undefined} />
                  <AvatarFallback>
                    {review.reviewer?.first_name?.[0]}{review.reviewer?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {review.reviewer?.first_name} {review.reviewer?.last_name}
                    </p>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${
                            i < review.rating 
                              ? 'fill-[#22C55E] text-[#22C55E]' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                  
                  {review.comment && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {review.comment}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {review.booking?.space?.title}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(review.created_at!), { 
                        addSuffix: true, 
                        locale: it 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {reviews.length > 0 && (
          <div className="text-center pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/bidirectional-reviews')}
            >
              Vedi Tutte le Recensioni
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
