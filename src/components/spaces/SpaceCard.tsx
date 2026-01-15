
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Users, Wifi } from 'lucide-react';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';
import { Space } from '@/types/space';
import { frontendLogger } from '@/utils/frontend-logger';
interface SpaceCardProps {
  space: Space;
  onClick: () => void;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ space, onClick }) => {
  // OPTIMIZATION: Use cached values from workspace record instead of separate fetches
  const reviewCount = space.cached_review_count || 0;
  const rating = space.cached_avg_rating || 0;

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

  const getWorkEnvironmentLabel = () => {
    switch (space.work_environment) {
      case 'silent': return 'Silenzioso';
      case 'controlled': return 'Controllato';
      case 'dynamic': return 'Dinamico';
      default: return space.work_environment;
    }
  };

  return (
    <Card
      className="group cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-gray-100 overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image Container */}
        <div className="relative h-56 overflow-hidden">
          <ResponsiveImage
            src={getMainPhoto() || '/placeholder.svg'}
            alt={space.name || space.title || 'Space image'}
            aspectRatio="photo"
            objectFit="cover"
            enableWebP={true}
            priority={false}
            onLoadComplete={() => frontendLogger.componentLoad(`Space card image: ${space.name || space.title}`, undefined, { component: 'SpaceCard' })}
            className="w-full h-full transform group-hover:scale-110 transition-transform duration-700"
          />

          {/* Overlay Gradient for Price Visibility */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm text-gray-800 shadow-sm font-medium">
              {getCategoryLabel()}
            </Badge>
          </div>
          <div className="absolute bottom-3 right-3">
             <div className="bg-indigo-600 text-white px-3 py-1 rounded-full shadow-lg font-bold text-sm">
               €{space.price_per_hour} <span className="font-normal text-xs">/ora</span>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
              {space.name || space.title}
            </h3>
            {reviewCount > 0 ? (
              <div className="flex items-center gap-1 text-sm bg-gray-50 px-2 py-1 rounded-md shrink-0">
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                <span className="font-bold text-gray-700">{rating.toFixed(1)}</span>
                <span className="text-gray-400 text-xs">({reviewCount})</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                Nuovo
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-gray-500 mb-4 text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-indigo-500" />
            <span className="line-clamp-1">{space.address}</span>
            {(space as any).distance_km && (
              <Badge variant="outline" className="ml-auto text-xs shrink-0 border-gray-200">
                {(space as any).distance_km} km
              </Badge>
            )}
          </div>

          {/* Amenities icons row */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-gray-500">
               <div className="flex items-center gap-1.5" title="Capienza">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{space.max_capacity ?? 1}</span>
              </div>
              {space.amenities?.includes('High-speed WiFi') && (
                <div className="flex items-center gap-1.5" title="WiFi Veloce">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">WiFi</span>
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 font-medium text-xs">
              Vedi dettagli
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
