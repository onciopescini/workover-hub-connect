import React from 'react';
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

  const handleBookingSuccess = () => {
    toast.success("Prenotazione creata con successo!");
  };

  const handleBookingError = (errorMessage: string) => {
    toast.error(errorMessage);
  };

  const handleLoginRequired = () => {
    navigate('/login');
  };

  // Use weighted rating from database
  const averageRating = weightedRating;

  // Mask address if user doesn't have precise location access
  const displayAddress = space.hasPreciseLocation 
    ? space.address 
    : `${space.city_name || 'Città'}${space.country_code ? ', ' + space.country_code : ''}`;

  const heroSpaceData = {
    id: space.id,
    title: space.title,
    address: displayAddress,
    photos: space.photos || ['/placeholder.svg'],
    category: space.category,
    rating: averageRating,
    reviewCount: reviews.length,
    isVerified: true,
    isSuperhost: false
  };

  const infoSpaceData = {
    max_capacity: space.max_capacity,
    amenities: space.amenities || [],
    work_environment: space.work_environment,
    description: space.description
  };

  const bookingSpaceData = {
    id: space.id,
    price_per_day: space.price_per_day,
    price_per_hour: space.price_per_hour,
    max_capacity: space.max_capacity,
    title: space.title,
    confirmation_type: space.confirmation_type || 'host_approval',
    host_stripe_account_id: space.host_stripe_account_id ?? '',
    host_stripe_connected: space.host_stripe_connected ?? false,
    availability: (space as any).availability || null
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
          <SpaceReviews spaceId={space.id} reviews={reviews} />
        </div>

        {/* Right Column: Sticky Booking Card (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
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
  );
}
