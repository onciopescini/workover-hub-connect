
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Verified, Award, Share, Heart } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface SpaceHeroSectionProps {
  space: {
    id: string;
    title: string;
    address: string;
    photos: string[];
    category: string;
    rating?: number;
    reviewCount?: number;
    isVerified?: boolean;
    isSuperhost?: boolean;
  };
}

export const SpaceHeroSection: React.FC<SpaceHeroSectionProps> = ({ space }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
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
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex text-sm text-gray-600">
        <span>Home</span>
        <span className="mx-2">/</span>
        <span>Spazi</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{space.title}</span>
      </nav>

      {/* Title and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{space.title}</h1>
            {space.isVerified && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Verified className="w-3 h-3 mr-1" />
                Verificato
              </Badge>
            )}
            {space.isSuperhost && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Award className="w-3 h-3 mr-1" />
                Superhost
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {space.rating && (
              <div className="flex items-center gap-1">
                {renderStars(space.rating)}
                <span className="font-medium">{space.rating.toFixed(1)}</span>
                <span>({space.reviewCount || 0} recensioni)</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{space.address}</span>
            </div>
            <Badge variant="outline">{getCategoryLabel()}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Condividi
          </Button>
          <Button variant="outline" size="sm">
            <Heart className="w-4 h-4 mr-2" />
            Salva
          </Button>
        </div>
      </div>

      {/* Photo Gallery */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-96">
          {/* Main Image */}
          <div className="md:col-span-2 relative">
            <OptimizedImage
              src={space.photos[currentImageIndex] || '/placeholder.svg'}
              alt={space.title}
              className="w-full h-full object-cover rounded-l-lg cursor-pointer"
              onClick={() => setShowAllPhotos(true)}
            />
          </div>
          
          {/* Thumbnail Grid */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            {space.photos.slice(1, 5).map((photo, index) => (
              <div key={index} className="relative">
                <OptimizedImage
                  src={photo}
                  alt={`${space.title} - Foto ${index + 2}`}
                  className="w-full h-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setCurrentImageIndex(index + 1)}
                />
                {index === 3 && space.photos.length > 5 && (
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white font-semibold cursor-pointer rounded"
                    onClick={() => setShowAllPhotos(true)}
                  >
                    +{space.photos.length - 5} foto
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
