
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Verified, Award, Share, Heart } from "lucide-react";
import { SpacePhotoGallery } from "./SpacePhotoGallery";

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
      <SpacePhotoGallery 
        photos={space.photos}
        spaceTitle={space.title}
      />
    </div>
  );
};
