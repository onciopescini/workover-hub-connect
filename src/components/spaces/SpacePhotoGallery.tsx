import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { PhotoGalleryLightbox } from "./PhotoGalleryLightbox";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

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

  // Carousel State
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const openLightbox = (index: number = 0) => {
    setLightboxInitialIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  // Initialize Carousel tracking
  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

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
      <div className={cn("relative group", className)}>

        {/* --- MOBILE CAROUSEL (< md) --- */}
        <div className="block md:hidden">
          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {photos.map((photo, index) => (
                <CarouselItem key={index}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                     <OptimizedImage
                        src={photo}
                        alt={`${spaceTitle} - Foto ${index + 1}`}
                        className="h-full w-full object-cover"
                        width={800}
                        height={600}
                        priority={index === 0}
                        onClick={() => openLightbox(index)}
                      />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Pagination Dots Overlay */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
              {photos.slice(0, 5).map((_, index) => (
                 <div
                   key={index}
                   className={cn(
                     "h-2 rounded-full transition-all duration-300 shadow-sm",
                     current === index + 1
                       ? "bg-white w-4"
                       : "bg-white/50 w-2"
                   )}
                 />
              ))}
               {photos.length > 5 && (
                  <div className={cn(
                     "h-2 rounded-full transition-all duration-300 shadow-sm",
                     current > 5
                       ? "bg-white w-4"
                       : "bg-white/50 w-2"
                   )} />
               )}
            </div>

            {/* Total count badge (Airbnb style) */}
             <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                {current} / {count}
             </div>

          </Carousel>
        </div>


        {/* --- DESKTOP GRID (>= md) --- */}
        <div className="hidden md:block">
          <div className={cn(
            "grid gap-2 overflow-hidden rounded-2xl",
            // Desktop: 4 columns (2+2 layout)
            "lg:grid-cols-4 lg:h-96",
            // Tablet: 2 columns
            "md:grid-cols-2 md:h-80"
          )}>
            {/* Main large image - responsive span */}
            <div className={cn(
              "relative",
              "lg:col-span-2",
              "md:col-span-1"
            )}>
              <OptimizedImage
                src={displayPhotos[0]}
                alt={`${spaceTitle} - Foto principale`}
                className={cn(
                  "w-full object-cover transition-opacity hover:opacity-90 cursor-pointer",
                  "lg:h-full",
                  "md:h-80"
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
              "md:col-span-1 md:grid-cols-2 md:grid-rows-2"
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
                        "md:h-40"
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
                          "absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold hover:bg-black/70 transition-colors text-lg"
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

          {/* Show all photos button overlay - Desktop Only */}
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
