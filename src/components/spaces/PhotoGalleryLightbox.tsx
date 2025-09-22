import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Focus management refs
  const triggerRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Focus management and keyboard navigation
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
          // Handle focus trap
          if (modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
              'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.shiftKey && document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      // Store the trigger element for focus restoration
      triggerRef.current = document.activeElement as HTMLElement;
      
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Focus the first focusable element
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
    } else {
      // Restore focus to trigger element
      setTimeout(() => {
        triggerRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, photos.length]);

  // Prefetch adjacent images
  useEffect(() => {
    if (!isOpen || photos.length <= 1) return;
    
    const prevIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    const nextIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    
    // Prefetch previous and next images
    [prevIndex, nextIndex].forEach(index => {
      if (photos[index]) {
        const img = new Image();
        img.src = photos[index];
      }
    });
  }, [currentIndex, photos, isOpen]);

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        data-testid="photo-lightbox"
      >
        <div ref={modalRef} className="relative w-full h-full flex flex-col">
          {/* Hidden title for screen readers */}
          <h2 id="lightbox-title" className="sr-only">
            Foto di {spaceTitle}
          </h2>
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button
                ref={firstFocusableRef}
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/10 rounded-full p-2"
                aria-label="Chiudi galleria"
                data-testid="close-button"
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
              aria-label={showThumbnails ? "Nascondi miniature" : "Mostra miniature"}
              data-testid="thumbnail-toggle"
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
                style={{ aspectRatio: 'auto' }}
                decoding="async"
                priority={currentIndex <= 2}
                data-testid={`lightbox-image-${currentIndex}`}
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
            data-testid="prev-button"
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
            data-testid="next-button"
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