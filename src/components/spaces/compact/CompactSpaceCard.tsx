import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Users, Wifi, Euro } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Space } from '@/types/space';
import { useSpaceWeightedRating, useSpaceReviews } from '@/hooks/queries/useSpaceReviews';

interface CompactSpaceCardProps {
  space: Space;
  onClick: () => void;
  isHighlighted?: boolean;
}

export const CompactSpaceCard: React.FC<CompactSpaceCardProps> = ({ 
  space, 
  onClick,
  isHighlighted = false 
}) => {
  const { data: reviews = [] } = useSpaceReviews(space.id);
  const { data: weightedRating = 0 } = useSpaceWeightedRating(space.id);

  const getMainPhoto = () => {
    if (space.photos && space.photos.length > 0) {
      return space.photos[0];
    }
    return '/placeholder.svg';
  };

  const getCategoryLabel = () => {
    switch (space.category) {
      case 'home': return 'Casa';
      case 'professional': return 'Professionale';
      case 'outdoor': return 'Outdoor';
      default: return space.category;
    }
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden h-[110px] ${
        isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-0 h-full">
        <div className="flex h-full">
          {/* Image - Fixed width */}
          <div className="relative w-[140px] flex-shrink-0">
            <OptimizedImage
              src={getMainPhoto()}
              alt={space.title || 'Space'}
              aspectRatio="square"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-white/90">
                {getCategoryLabel()}
              </Badge>
            </div>
          </div>

          {/* Content - Flexible width */}
          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
            {/* Top section */}
            <div className="space-y-1">
              <h3 className="font-semibold text-sm line-clamp-1 text-foreground">
                {space.title}
              </h3>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{space.address || 'Location'}</span>
              </div>
              
              {/* Rating & Reviews */}
              {weightedRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs font-medium">{weightedRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviews.length})</span>
                </div>
              )}
            </div>

            {/* Bottom section */}
            <div className="flex items-center justify-between">
              {/* Amenities */}
              <div className="flex items-center gap-2">
                {space.amenities?.includes('wifi') && (
                  <Wifi className="w-3 h-3 text-muted-foreground" />
                )}
                {space.capacity && (
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{space.capacity}</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center gap-1">
                <Euro className="w-3 h-3 text-foreground" />
                <span className="font-bold text-sm text-foreground">
                  {space.price_per_hour?.toFixed(0) || 0}
                </span>
                <span className="text-xs text-muted-foreground">/h</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
