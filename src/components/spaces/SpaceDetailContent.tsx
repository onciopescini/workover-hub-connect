
import React, { useState } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { useNavigate } from 'react-router-dom';
import { Space } from "@/types/space";
import { Review } from "@/lib/review-utils";
import { SpaceHeroSection } from './SpaceHeroSection';
import { SpaceInfoCards } from './SpaceInfoCards';
import { HostProfileSection } from './HostProfileSection';
import { StickyBookingCard } from './StickyBookingCard';
import { SpaceReviews } from './SpaceReviews';
import { toast } from 'sonner';
import { createOrGetPrivateChat } from "@/lib/networking-utils";

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
}

interface SpaceDetailContentProps {
  space: ExtendedSpace;
  reviews: Review[];
}

export function SpaceDetailContent({ space, reviews }: SpaceDetailContentProps) {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [startingChat, setStartingChat] = useState(false);

  const handleBookingSuccess = () => {
    toast.success("Prenotazione creata con successo!");
  };

  const handleBookingError = (errorMessage: string) => {
    toast.error(errorMessage);
  };

  const handleLoginRequired = () => {
    navigate('/login');
  };

  const handleMessageHost = async () => {
    if (!space.host || startingChat) return;

    setStartingChat(true);
    try {
      const chatId = await createOrGetPrivateChat(space.host.id);
      if (chatId) {
        window.location.href = `/messages/private/${chatId}`;
      } else {
        toast.error("Impossibile avviare la chat");
      }
    } catch (error) {
      console.error('Error starting private chat:', error);
      toast.error("Errore nell'avvio della chat");
    } finally {
      setStartingChat(false);
    }
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
    isSuperhost: space.host ? true : false
  };

  // Transform space data for info cards
  const infoSpaceData = {
    max_capacity: space.max_capacity,
    amenities: space.amenities || [],
    work_environment: space.work_environment,
    description: space.description
  };

  // Transform space data for booking card - INCLUDE confirmation_type
  const bookingSpaceData = {
    id: space.id,
    price_per_day: space.price_per_day,
    max_capacity: space.max_capacity,
    title: space.title,
    confirmation_type: space.confirmation_type || 'host_approval'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Section */}
          <SpaceHeroSection space={heroSpaceData} />
          
          {/* Space Information */}
          <SpaceInfoCards space={infoSpaceData} />
          
          {/* Host Profile */}
          {space.host && (
            <HostProfileSection 
              host={space.host} 
              onMessageHost={handleMessageHost}
            />
          )}
          
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
