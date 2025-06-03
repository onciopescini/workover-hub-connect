
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Users } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Space } from '@/types/space';

interface SpaceMapPreviewProps {
  space: Space;
  onViewDetails: (spaceId: string) => void;
}

export const SpaceMapPreview: React.FC<SpaceMapPreviewProps> = ({ space, onViewDetails }) => {
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
    <Card className="w-80 shadow-lg">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-32 overflow-hidden rounded-t-lg">
          <OptimizedImage
            src={getMainPhoto()}
            alt={space.title}
            className="w-full h-full object-cover"
            enableWebP={true}
            enableResponsive={true}
            priority={true} // Map previews are immediately visible
            quality={0.9} // Higher quality for preview cards
            onLoadComplete={() => console.log(`Map preview loaded: ${space.title}`)}
          />
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-white/90 text-xs">
              {getCategoryLabel()}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge className="bg-indigo-600 text-xs">
              €{space.price_per_hour}/ora
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-sm line-clamp-1">{space.title}</h3>
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span>4.8</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-gray-600 mb-2">
            <MapPin className="h-3 w-3" />
            <span className="text-xs line-clamp-1">{space.address}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-2 text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="text-xs">{space.max_capacity || space.capacity || 1}</span>
            </div>
            {space.amenities?.includes('High-speed WiFi') && <span className="text-xs">📶</span>}
            {space.amenities?.includes('Coffee & Tea') && <span className="text-xs">☕</span>}
          </div>

          <Button 
            size="sm" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs h-8"
            onClick={() => onViewDetails(space.id)}
          >
            Visualizza dettagli
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
