
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Star, 
  Users, 
  Wifi, 
  Heart, 
  Share2, 
  Verified, 
  Award, 
  Clock,
  Euro,
  Camera,
  Coffee,
  Car
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Space } from '@/types/space';

interface EnhancedSpaceCardProps {
  space: Space;
  onClick: () => void;
}

export const EnhancedSpaceCard: React.FC<EnhancedSpaceCardProps> = ({ space, onClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  
  // OPTIMIZATION: Use cached values from workspace record instead of separate fetches
  const reviewCount = space.cached_review_count || 0;
  const rating = space.cached_avg_rating || 0;

  const getMainPhotos = () => {
    if (space.photos && space.photos.length > 0) {
      return space.photos.slice(0, 4);
    }
    return ['/placeholder.svg'];
  };

  const getCategoryLabel = () => {
    switch (space.category) {
      case 'home': return 'Casa';
      case 'professional': return 'Professionale';
      case 'outdoor': return 'Outdoor';
      default: return space.category;
    }
  };

  const getWorkEnvironmentColor = () => {
    switch (space.work_environment) {
      case 'silent': return 'bg-blue-100 text-blue-800';
      case 'controlled': return 'bg-green-100 text-green-800';
      case 'dynamic': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const photos = getMainPhotos();
  // Note: questi campi non esistono nel tipo Space, rimossi per ora
  const isVerified = false; 
  const isSuperhost = false;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Implementare logica di condivisione
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group overflow-hidden">
      <CardContent className="p-0">
        {/* Image Gallery */}
        <div className="relative h-56 overflow-hidden">
          <OptimizedImage
            src={photos[currentImageIndex]}
            alt={space.name || space.title || 'Space'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onClick={onClick}
          />
          
          {/* Image Navigation Dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {photos.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                />
              ))}
            </div>
          )}

          {/* Photo Count Badge */}
          {photos.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {photos.length}
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
              {getCategoryLabel()}
            </Badge>
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-12 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 bg-white/80 hover:bg-white backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-8 h-8 p-0 backdrop-blur-sm ${
                isLiked 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white/80 hover:bg-white'
              }`}
              onClick={handleLike}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 right-3 bg-indigo-600 text-white px-3 py-1 rounded-full font-semibold text-sm">
            €{space.price_per_day}/giorno
          </div>
        </div>

        {/* Content */}
        <div className="p-4" onClick={onClick}>
          {/* Title and Verification */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-1 flex-1 mr-2">{space.name || space.title}</h3>
            <div className="flex items-center gap-1">
              {isVerified && (
                <Badge variant="outline" className="border-blue-200 text-blue-700 px-2 py-0">
                  <Verified className="w-3 h-3 mr-1" />
                  Verificato
                </Badge>
              )}
              {isSuperhost && (
                <Badge variant="outline" className="border-yellow-200 text-yellow-700 px-2 py-0">
                  <Award className="w-3 h-3 mr-1" />
                  Superhost
                </Badge>
              )}
            </div>
          </div>

          {/* Rating and Reviews */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1">
                {renderStars(rating)}
                <span className="font-medium text-sm ml-1">{rating.toFixed(1)}</span>
                <span className="text-gray-600 text-sm">({reviewCount})</span>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-600 mb-3">
            <MapPin className="w-4 h-4" />
            <span className="text-sm line-clamp-1">{space.address}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Fino a {space.max_capacity}</span>
            </div>
            {space.amenities?.includes('High-speed WiFi') && (
              <div className="flex items-center gap-1">
                <Wifi className="w-4 h-4 text-green-600" />
                <span>WiFi</span>
              </div>
            )}
            {space.amenities?.includes('Coffee & Tea') && (
              <div className="flex items-center gap-1">
                <Coffee className="w-4 h-4 text-brown-600" />
                <span>Caffè</span>
              </div>
            )}
            {space.amenities?.includes('Parking') && (
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4 text-blue-600" />
                <span>Parcheggio</span>
              </div>
            )}
          </div>

          {/* Work Environment */}
          {space.work_environment && (
            <div className="mb-3">
              <Badge className={`${getWorkEnvironmentColor()} text-xs`}>
                {space.work_environment === 'silent' && 'Ambiente Silenzioso'}
                {space.work_environment === 'controlled' && 'Ambiente Controllato'}
                {space.work_environment === 'dynamic' && 'Ambiente Dinamico'}
              </Badge>
            </div>
          )}

          {/* Description */}
          {space.description && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-relaxed">
              {space.description}
            </p>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-sm font-medium text-indigo-600">
              <Euro className="w-4 h-4" />
              <span>€{space.price_per_hour}/ora</span>
            </div>
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Prenota ora
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
