
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Users, Wifi } from 'lucide-react';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage';
import { Space } from '@/types/space';

interface SpaceCardProps {
  space: Space;
  onClick: () => void;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ space, onClick }) => {
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
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          <ResponsiveImage
            src={getMainPhoto() || '/placeholder.svg'}
            alt={space.title || 'Space image'}
            aspectRatio="photo"
            objectFit="cover"
            enableWebP={true}
            priority={false}
            onLoadComplete={() => console.log(`Space card image loaded: ${space.title}`)}
            className="w-full h-full"
          />
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-white/90">
              {getCategoryLabel()}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge className="bg-indigo-600">
              €{space.price_per_hour}/ora
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">{space.title}</h3>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>4.8</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-gray-600 mb-2">
            <MapPin className="h-4 w-4" />
            <span className="text-sm line-clamp-1">{space.address}</span>
          </div>

          {space.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {space.description}
            </p>
          )}

          {/* Features */}
          <div className="flex flex-wrap gap-1 mb-3">
            {space.workspace_features?.slice(0, 2).map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {space.workspace_features && space.workspace_features.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{space.workspace_features.length - 2}
              </Badge>
            )}
          </div>

          {/* Amenities icons */}
          <div className="flex items-center gap-3 text-gray-500 mb-3">
            {space.amenities?.includes('High-speed WiFi') && <Wifi className="h-4 w-4" />}
            {space.amenities?.includes('Coffee & Tea') && <span className="text-sm">☕</span>}
            {space.amenities?.includes('Parking') && <span className="text-sm">🅿️</span>}
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">{space.max_capacity || space.capacity || 1}</span>
            </div>
          </div>

          {/* Work Environment */}
          {space.work_environment && (
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {getWorkEnvironmentLabel()}
              </Badge>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                Visualizza dettagli
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
