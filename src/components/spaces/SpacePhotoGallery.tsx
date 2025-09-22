import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { PhotoGalleryLightbox } from "./PhotoGalleryLightbox";
import { cn } from "@/lib/utils";

interface SpacePhotoGalleryProps {
  photos: string[];
  spaceTitle: string;
  className?: string;
}

export const SpacePhotoGallery: React.FC<SpacePhotoGalleryProps> = ({
  photos,
  spaceTitle,
  className
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  const openLightbox = (index: number = 0) => {
    setLightboxInitialIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  if (!photos || photos.length === 0) {
    return (
      <div className={cn("w-full h-96 bg-gray-100 rounded-2xl flex items-center justify-center", className)}>
        <span className="text-gray-500">Nessuna foto disponibile</span>
      </div>
    );
  }

  // Show at least one photo, up to 5 for the collage
  const displayPhotos = photos.slice(0, 5);
  const remainingPhotosCount = Math.max(0, photos.length - 5);

  return (
    <>
      <div className={cn("relative group cursor-pointer", className)}>
        <div className="grid grid-cols-4 gap-2 h-96 overflow-hidden rounded-2xl">
          {/* Main large image - takes 2 columns */}
          <div className="col-span-2 relative">
            <OptimizedImage
              src={displayPhotos[0]}
              alt={`${spaceTitle} - Foto principale`}
              className="w-full h-full object-cover transition-opacity hover:opacity-90"
              onClick={() => openLightbox(0)}
              priority={true}
            />
          </div>

          {/* Right side - 2x2 grid of smaller images */}
          <div className="col-span-2 grid grid-rows-2 gap-2">
            {displayPhotos.slice(1, 5).map((photo, index) => {
              const photoIndex = index + 1;
              const isLast = index === 3; // Last position in the 2x2 grid
              
              return (
                <div key={photoIndex} className="relative">
                  <OptimizedImage
                    src={photo}
                    alt={`${spaceTitle} - Foto ${photoIndex + 1}`}
                    className="w-full h-full object-cover transition-opacity hover:opacity-90"
                    onClick={() => openLightbox(photoIndex)}
                    priority={photoIndex <= 2}
                  />
                  
                  {/* Show remaining count overlay on last image */}
                  {isLast && remainingPhotosCount > 0 && (
                    <div 
                      className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-lg hover:bg-black/70 transition-colors"
                      onClick={() => openLightbox(4)}
                    >
                      +{remainingPhotosCount}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Fill empty slots if less than 5 photos */}
            {displayPhotos.length < 5 && (
              <>
                {Array.from({ length: 4 - (displayPhotos.length - 1) }).map((_, index) => (
                  <div 
                    key={`empty-${index}`}
                    className="bg-gray-100 flex items-center justify-center"
                  >
                    <span className="text-gray-400 text-sm">Foto non disponibile</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Show all photos button overlay */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openLightbox(0)}
            className="bg-white/90 text-black hover:bg-white shadow-lg"
          >
            Mostra tutte le foto ({photos.length})
          </Button>
        </div>
      </div>

      {/* Lightbox Modal */}
      <PhotoGalleryLightbox
        photos={photos}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        spaceTitle={spaceTitle}
      />
    </>
  );
};