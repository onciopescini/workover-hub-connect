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
  size?: 'compact' | 'standard' | 'comfortable';
}

export const CompactSpaceCard: React.FC<CompactSpaceCardProps> = ({
  space,
  onClick,
  isHighlighted = false,
  size = 'standard'
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

  // Size configurations for adaptive cards
  const sizeConfig = {
    compact: {
      height: 'h-[110px]',
      imageWidth: 'w-[140px]',
      padding: 'p-3',
      titleSize: 'text-sm',
      showDescription: false,
      maxAmenities: 2
    },
    standard: {
      height: 'h-[140px]',
      imageWidth: 'w-[160px]',
      padding: 'p-4',
      titleSize: 'text-base',
      showDescription: true,
      maxAmenities: 4
    },
    comfortable: {
      height: 'h-[180px]',
      imageWidth: 'w-[200px]',
      padding: 'p-5',
      titleSize: 'text-lg',
      showDescription: true,
      maxAmenities: 6
    }
  };

  const config = sizeConfig[size];

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden ${config.height} ${
        isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-0 h-full">
        <div className="flex h-full">
          {/* Image - Dynamic width based on size */}
          <div className={`relative ${config.imageWidth} flex-shrink-0`}>
            <OptimizedImage
              src={getMainPhoto()}
              alt={space.title || 'Space'}
              aspectRatio="square"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 bg-white/90 ${size === 'comfortable' ? 'text-xs h-6' : ''}`}>
                {getCategoryLabel()}
              </Badge>
            </div>
          </div>

          {/* Content - Flexible width with dynamic padding */}
          <div className={`flex-1 ${config.padding} flex flex-col justify-between min-w-0`}>
            {/* Top section */}
            <div className="space-y-1">
              <h3 className={`font-semibold line-clamp-1 text-foreground ${config.titleSize}`}>
                {space.title}
              </h3>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className={size === 'comfortable' ? 'w-4 h-4' : 'w-3 h-3'} />
                <span className="truncate">{space.address || 'Location'}</span>
              </div>

              {/* Description - only for standard and comfortable */}
              {config.showDescription && space.description && (
                <p className={`text-xs text-muted-foreground ${size === 'standard' ? 'line-clamp-1' : 'line-clamp-2'}`}>
                  {space.description}
                </p>
              )}
              
              {/* Rating & Reviews - More prominent on comfortable */}
              {weightedRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className={`text-yellow-400 fill-current ${size === 'comfortable' ? 'w-4 h-4' : 'w-3 h-3'}`} />
                  <span className={`font-medium ${size === 'comfortable' ? 'text-sm' : 'text-xs'}`}>{weightedRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviews.length})</span>
                </div>
              )}
            </div>

            {/* Bottom section */}
            <div className="flex items-center justify-between">
              {/* Amenities - limited by size config */}
              <div className="flex items-center gap-2">
                {space.amenities?.slice(0, config.maxAmenities).map((amenity, idx) => {
                  if (amenity === 'wifi') return <Wifi key={idx} className={size === 'comfortable' ? 'w-4 h-4 text-muted-foreground' : 'w-3 h-3 text-muted-foreground'} />;
                  return null;
                })}
                {space.capacity && (
                  <div className={`flex items-center gap-0.5 text-muted-foreground ${size === 'comfortable' ? 'text-sm' : 'text-xs'}`}>
                    <Users className={size === 'comfortable' ? 'w-4 h-4' : 'w-3 h-3'} />
                    <span>{space.capacity}</span>
                  </div>
                )}
              </div>

              {/* Price - More prominent on comfortable */}
              <div className="flex items-center gap-1">
                <Euro className={size === 'comfortable' ? 'w-4 h-4 text-foreground' : 'w-3 h-3 text-foreground'} />
                <span className={`font-bold text-foreground ${size === 'comfortable' ? 'text-base' : 'text-sm'}`}>
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
