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
      <div 
        className={cn("w-full h-96 bg-muted rounded-2xl flex items-center justify-center", className)}
        role="status"
        aria-live="polite"
        data-testid="no-photos-message"
      >
        <span className="text-muted-foreground">Nessuna foto disponibile</span>
      </div>
    );
  }

  // Show at least one photo, up to 5 for the collage
  const displayPhotos = photos.slice(0, 5);
  const remainingPhotosCount = Math.max(0, photos.length - 5);

  return (
    <>
      <div className={cn("relative group cursor-pointer", className)}>
        <div className={cn(
          "grid gap-2 overflow-hidden rounded-2xl",
          // Desktop: 4 columns (2+2 layout)
          "lg:grid-cols-4 lg:h-96",
          // Tablet: 2 columns
          "md:grid-cols-2 md:h-80",
          // Mobile: 1 column
          "sm:grid-cols-1 sm:h-auto sm:max-h-[600px]"
        )}>
          {/* Main large image - responsive span */}
          <div className={cn(
            "relative",
            "lg:col-span-2",
            "md:col-span-1",
            "sm:col-span-1"
          )}>
            <OptimizedImage
              src={displayPhotos[0]}
              alt={`${spaceTitle} - Foto principale`}
              className={cn(
                "w-full object-cover transition-opacity hover:opacity-90 cursor-pointer",
                "lg:h-full",
                "md:h-80",
                "sm:h-64"
              )}
              width={800}
              height={600}
              decoding="async"
              onClick={() => openLightbox(0)}
              priority={true}
              data-testid="gallery-tile-0"
            />
          </div>

          {/* Right side - responsive grid */}
          <div className={cn(
            "grid gap-2",
            "lg:col-span-2 lg:grid-rows-2",
            "md:col-span-1 md:grid-cols-2 md:grid-rows-2",
            "sm:col-span-1 sm:grid-cols-2 sm:auto-rows-fr"
          )}>
            {displayPhotos.slice(1, 5).map((photo, index) => {
              const photoIndex = index + 1;
              const isLast = index === 3;
              
              return (
                <div key={photoIndex} className="relative">
                  <OptimizedImage
                    src={photo}
                    alt={`${spaceTitle} - Foto ${photoIndex + 1}`}
                    className={cn(
                      "w-full object-cover transition-opacity hover:opacity-90 cursor-pointer",
                      "lg:h-full",
                      "md:h-40",
                      "sm:h-32"
                    )}
                    width={400}
                    height={300}
                    decoding="async"
                    onClick={() => openLightbox(photoIndex)}
                    priority={photoIndex <= 2}
                    data-testid={`gallery-tile-${photoIndex}`}
                  />
                  
                  {/* Show remaining count overlay on last image */}
                  {isLast && remainingPhotosCount > 0 && (
                    <div 
                      className={cn(
                        "absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold hover:bg-black/70 transition-colors",
                        "lg:text-lg",
                        "md:text-base",
                        "sm:text-sm"
                      )}
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
                    className="bg-muted rounded-lg flex items-center justify-center"
                    aria-hidden="true"
                    data-testid={`empty-slot-${index}`}
                  >
                    <span className="text-muted-foreground text-sm">Foto non disponibile</span>
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
            data-testid="show-all-photos-button"
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