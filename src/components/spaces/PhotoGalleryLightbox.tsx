import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ChevronLeft, ChevronRight, X, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoGalleryLightboxProps {
  photos: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  spaceTitle: string;
}

export const PhotoGalleryLightbox: React.FC<PhotoGalleryLightboxProps> = ({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  spaceTitle
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Reset index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          // Allow tab navigation within modal
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, photos.length]);

  const navigatePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const navigateNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    const firstTouch = e.targetTouches[0];
    if (firstTouch) {
      setTouchStart(firstTouch.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const firstTouch = e.targetTouches[0];
    if (firstTouch) {
      setTouchEnd(firstTouch.clientX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      navigateNext();
    } else if (isRightSwipe) {
      navigatePrevious();
    }
    
    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!photos.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 bg-black/95"
        aria-label={`Galleria foto di ${spaceTitle}`}
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10 rounded-full p-2"
                aria-label="Chiudi galleria"
              >
                <X className="w-5 h-5" />
              </Button>
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="text-white hover:bg-white/10 rounded-full p-2"
              aria-label="Mostra miniature"
            >
              <Grid3X3 className="w-5 h-5" />
            </Button>
          </div>

          {/* Main Image */}
          <div 
            className="flex-1 flex items-center justify-center px-16 py-20"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <OptimizedImage
                src={photos[currentIndex]}
                alt={`${spaceTitle} - Foto ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                priority={currentIndex <= 2}
              />
            </div>
          </div>

          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="sm"
            onClick={navigatePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/10 rounded-full p-2"
            aria-label="Foto precedente"
            disabled={photos.length <= 1}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/10 rounded-full p-2"
            aria-label="Foto successiva"
            disabled={photos.length <= 1}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Thumbnail Strip */}
          {showThumbnails && (
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm">
              <div className="flex gap-2 p-4 overflow-x-auto">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                      currentIndex === index
                        ? "border-white"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                    aria-label={`Vai alla foto ${index + 1}`}
                  >
                    <OptimizedImage
                      src={photo}
                      alt={`${spaceTitle} - Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};