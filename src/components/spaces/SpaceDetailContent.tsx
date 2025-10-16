import React from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { useNavigate } from 'react-router-dom';
import { Space } from "@/types/space";
import { SpaceReview } from "@/lib/space-review-utils";
import { SpaceHeroSection } from './SpaceHeroSection';
import { SpaceInfoCards } from './SpaceInfoCards';
import { HostProfileSection } from './HostProfileSection';
import { StickyBookingCard } from './StickyBookingCard';
import { SpaceReviews } from './SpaceReviews';
import { LocationAccessNotice } from './LocationAccessNotice';
import { toast } from 'sonner';
import { WhoWorksHere } from './WhoWorksHere';

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
}

export function SpaceDetailContent({ space, reviews }: SpaceDetailContentProps) {
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

  // Calculate average rating from reviews
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  // Transform space data for hero section
  const heroSpaceData = {
    id: space.id,
    title: space.title,
    address: space.address,
    photos: space.photos || ['/placeholder.svg'],
    category: space.category,
    rating: averageRating,
    reviewCount: reviews.length,
    isVerified: true,
    isSuperhost: false
  };

  // Transform space data for info cards
  const infoSpaceData = {
    max_capacity: space.max_capacity,
    amenities: space.amenities || [],
    work_environment: space.work_environment,
    description: space.description
  };

  // Transform space data for booking card
  const bookingSpaceData = {
    id: space.id,
    price_per_day: space.price_per_day,
    max_capacity: space.max_capacity,
    title: space.title,
    confirmation_type: space.confirmation_type || 'host_approval',
    host_stripe_account_id: space.host_stripe_account_id ?? '',
    host_stripe_connected: space.host_stripe_connected ?? false,
    availability: (space as any).availability || null
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Section */}
          <SpaceHeroSection space={heroSpaceData} />
          
          {/* Location Access Notice */}
          <LocationAccessNotice 
            hasAccess={!!space.hasPreciseLocation} 
            hasConfirmedBooking={!!space.hasConfirmedBooking}
          />
          
          {/* Space Information */}
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

        {/* Sticky Booking Sidebar */}
        <div className="lg:col-span-1">
          <StickyBookingCard
            space={bookingSpaceData}
            isAuthenticated={authState.isAuthenticated}
            onLoginRequired={handleLoginRequired}
            onBookingSuccess={handleBookingSuccess}
            onBookingError={handleBookingError}
          />
        </div>
      </div>
    </div>
  );
}
