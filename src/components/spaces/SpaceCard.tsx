
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
  Camera,
  Coffee,
  Car,
  Euro
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Space } from '@/types/space';
import { frontendLogger } from '@/utils/frontend-logger';

interface SpaceCardProps {
  space: Space;
  onClick: () => void;
  variant?: 'simple' | 'enhanced';
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ space, onClick, variant = 'simple' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // OPTIMIZATION: Use cached values from workspace record instead of separate fetches
  const reviewCount = space.cached_review_count || 0;
  const rating = space.cached_avg_rating || 0;

  const getPhotos = () => {
    if (space.photos && space.photos.length > 0) {
      if (variant === 'enhanced') {
        return space.photos.slice(0, 4);
      }
      return [space.photos[0]];
    }
    return ['/placeholder.svg'];
  };

  const photos = getPhotos();

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
    // Implement share logic
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  // --- SIMPLE VARIANT ---
  if (variant === 'simple') {
    return (
      <Card
        className="group cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-gray-100 overflow-hidden"
        onClick={onClick}
      >
        <CardContent className="p-0">
          {/* Image Container */}
          <div className="relative h-56 overflow-hidden">
            <OptimizedImage
              src={photos[0]}
              alt={space.name || space.title || 'Space image'}
              className="w-full h-full transform group-hover:scale-110 transition-transform duration-700 object-cover"
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
  }

  // --- ENHANCED VARIANT ---
  const isVerified = false; // Placeholder
  const isSuperhost = false; // Placeholder

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
          <div className="flex items-center gap-3 mb-2 min-h-[20px]">
            {reviewCount > 0 ? (
              <div className="flex items-center gap-1">
                {renderStars(rating)}
                <span className="font-medium text-sm ml-1">{rating.toFixed(1)}</span>
                <span className="text-gray-600 text-sm">({reviewCount})</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Nuovo
              </Badge>
            )}
          </div>

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
