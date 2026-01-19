import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { useNavigate } from 'react-router-dom';
import { Space } from "@/types/space";
import { SpaceHeroSection } from './SpaceHeroSection';
import { SpaceInfoCards } from './SpaceInfoCards';
import { HostProfileSection } from './HostProfileSection';
import { BookingCard } from './BookingCard';
import { SpaceReviews } from './SpaceReviews';
import { LocationAccessNotice } from './LocationAccessNotice';
import { toast } from 'sonner';
import { WhoWorksHere } from './WhoWorksHere';
import { StickyMobileBookingBar } from './StickyMobileBookingBar';

// Inline interface definition to replace missing import
export interface SpaceReview {
  id: string;
  rating: number;
  content?: string;
  created_at: string;
  user_id: string;
  user?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

interface ExtendedSpace extends Space {
  host?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
    bio?: string;
    location?: string;
    created_at: string;
  };
  host_stripe_account_id?: string;
  host_stripe_connected?: boolean;
  host_total_spaces?: number;
  // Location access metadata
  hasPreciseLocation?: boolean;
  hasConfirmedBooking?: boolean;
}

interface SpaceDetailContentProps {
  space: ExtendedSpace;
  reviews: SpaceReview[];
  weightedRating?: number;
}

export function SpaceDetailContent({ space, reviews, weightedRating = 0 }: SpaceDetailContentProps) {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [isStickyBarVisible, setIsStickyBarVisible] = useState(true);
  const bookingCardRef = useRef<HTMLDivElement>(null);

  const handleBookingSuccess = () => {
    toast.success("Prenotazione creata con successo!");
  };

  const handleBookingError = (errorMessage: string) => {
    toast.error(errorMessage);
  };

  const handleLoginRequired = () => {
    navigate('/login');
  };

  const handleStickyBarClick = () => {
    const element = document.getElementById('booking-card-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Intersection Observer to toggle Sticky Bar visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // If the booking card is intersecting (visible), hide the sticky bar
        setIsStickyBarVisible(!entry.isIntersecting);
      },
      {
        root: null, // viewport
        threshold: 0.1, // trigger when 10% of the target is visible
      }
    );

    const target = bookingCardRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, []);

  // Use weighted rating from database
  const averageRating = weightedRating;

  // Mask address if user doesn't have precise location access
  const displayAddress = space.hasPreciseLocation 
    ? space.address 
    : `${space.city || space.city_name || 'Città'}${space.country_code ? ', ' + space.country_code : ''}`;

  const heroSpaceData = {
    id: space.id,
    title: space.name || space.title || 'Spazio',
    address: displayAddress || '',
    photos: space.photos || ['/placeholder.svg'],
    category: space.category || 'home',
    rating: averageRating,
    reviewCount: reviews.length,
    isVerified: true,
    isSuperhost: false
  };

  const infoSpaceData: { max_capacity: number; amenities: string[]; work_environment?: string; description: string } = {
    max_capacity: space.max_capacity ?? 1,
    amenities: space.amenities || [],
    description: space.description || ''
  };
  if (space.work_environment) {
    infoSpaceData.work_environment = space.work_environment;
  }

  const bookingSpaceData = {
    id: space.id,
    price_per_day: space.price_per_day,
    price_per_hour: space.price_per_hour,
    max_capacity: space.max_capacity ?? 1,
    title: space.name || space.title || 'Spazio',
    confirmation_type: space.confirmation_type || 'host_approval',
    host_stripe_account_id: space.host_stripe_account_id ?? '',
    host_stripe_connected: space.host_stripe_connected ?? false,
    availability: (space as any).availability || null,
    timezone: space.timezone
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* 2-Column Grid for Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Main Content (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section (Title, Gallery, Meta) */}
            <SpaceHeroSection space={heroSpaceData} />

            {/* Location Access Notice */}
            <LocationAccessNotice
              hasAccess={!!space.hasPreciseLocation}
              hasConfirmedBooking={!!space.hasConfirmedBooking}
            />

            {/* Space Information (Description, Amenities, Policies) */}
            <SpaceInfoCards space={infoSpaceData} />

            {/* Host Profile */}
            {space.host && (
              <HostProfileSection
                host={space.host}
                averageRating={averageRating}
                totalReviews={reviews.length}
                totalSpaces={space.host_total_spaces ?? 0}
              />
            )}

            {/* Who Works Here Widget */}
            <WhoWorksHere spaceId={space.id} />

            {/* Reviews Section */}
            <SpaceReviews spaceId={space.id} reviews={reviews as any} />
          </div>

          {/* Right Column: Sticky Booking Card (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24" id="booking-card-section" ref={bookingCardRef}>
               <BookingCard
                space={bookingSpaceData}
                isAuthenticated={authState.isAuthenticated}
                onLoginRequired={handleLoginRequired}
                onBookingSuccess={handleBookingSuccess}
                onBookingError={handleBookingError}
              />
              {/* Additional trust signals or small widgets can go here below the booking card */}
              <div className="mt-4 text-center text-xs text-gray-400">
                 <p>Segnala questo annuncio</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bar - visible only on mobile when booking card is out of view */}
      <StickyMobileBookingBar
        pricePerDay={space.price_per_day}
        pricePerHour={space.price_per_hour}
        onBookClick={handleStickyBarClick}
        isVisible={isStickyBarVisible}
      />
    </>
  );
}
