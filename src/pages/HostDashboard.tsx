
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { DashboardStats } from "@/components/host/DashboardStats";
import { QuickActions } from "@/components/host/QuickActions";
import { RecentBookings } from "@/components/host/RecentBookings";
import { PendingBookings } from "@/components/host/PendingBookings";
import { RecentMessages } from "@/components/host/RecentMessages";
import { RecentReviews } from "@/components/host/RecentReviews";
import { SpaceChecklist } from "@/components/host/SpaceChecklist";
import { StripeSetupFixed } from "@/components/host/StripeSetupFixed";
import { WelcomeMessage } from "@/components/host/WelcomeMessage";
import { 
  useHostSpacesQuery, 
  useHostBookingsQuery, 
  useHostMessagesQuery, 
  useHostReviewsQuery 
} from "@/hooks/queries/useHostDashboardQuery";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface ChecklistItem {
  id: string;
  section: string;
  completed: boolean;
}

// Helper function to safely convert Json array to string array
const jsonArrayToStringArray = (jsonArray: Json[] | Json | null): string[] => {
  if (!jsonArray) return [];
  
  if (Array.isArray(jsonArray)) {
    return jsonArray.filter((item): item is string => typeof item === 'string');
  }
  
  return [];
};

const HostDashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isNewHost, setIsNewHost] = useState(false);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);

  // React Query hooks
  const { data: totalSpaces = 0, isLoading: spacesLoading } = useHostSpacesQuery();
  const { data: bookings = [], isLoading: bookingsLoading } = useHostBookingsQuery();
  const { data: messages = [], isLoading: messagesLoading } = useHostMessagesQuery(bookings);
  const { data: reviewsData, isLoading: reviewsLoading } = useHostReviewsQuery();

  // Redirect non-hosts to regular dashboard
  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  // Check if this is a new host
  useEffect(() => {
    if (authState.profile?.onboarding_completed) {
      const onboardingDate = new Date(authState.profile.updated_at);
      const now = new Date();
      const hoursSinceOnboarding = (now.getTime() - onboardingDate.getTime()) / (1000 * 60 * 60);
      
      setIsNewHost(hoursSinceOnboarding < 24);
    }
  }, [authState.profile]);

  // Fetch checklist data (keeping this separate as it's less critical)
  useEffect(() => {
    const fetchChecklist = async () => {
      if (!authState.user || totalSpaces === 0) return;

      try {
        const { data: spacesData } = await supabase
          .from("spaces")
          .select("id")
          .eq("host_id", authState.user.id)
          .limit(1);

        if (spacesData && spacesData.length > 0) {
          const { data: checklistData } = await supabase
            .from("checklists")
            .select("*")
            .eq("space_id", spacesData[0].id);

          setChecklists(checklistData || []);
        }
      } catch (error) {
        console.error('Error fetching checklist:', error);
      }
    };

    fetchChecklist();
  }, [authState.user, totalSpaces]);

  // Calculate stats from queries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activeBookings = bookings.filter(
    booking => booking.status === 'confirmed' && 
    new Date(booking.booking_date) >= today
  ).length;

  const unreadMessages = messages.filter(m => !m.is_read).length;
  const averageRating = reviewsData?.averageRating || null;
  const recentReviews = reviewsData?.reviews || [];

  // Function to refresh bookings after updates
  const handleBookingUpdate = () => {
    window.location.reload(); // Simple refresh for now
  };

  // Show loading screen while critical data is being fetched
  const isLoading = authState.isLoading || spacesLoading || bookingsLoading;
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect non-hosts
  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Host</h1>
        <p className="text-gray-600">Benvenuto, {authState.profile?.first_name || "Host"}</p>
      </div>

      {/* Welcome Message for New Hosts */}
      {isNewHost && <WelcomeMessage />}

      {/* Stripe Setup Section */}
      <div data-stripe-setup>
        <StripeSetupFixed />
      </div>

      {/* Statistics Cards */}
      <DashboardStats 
        totalSpaces={totalSpaces}
        activeBookings={activeBookings}
        averageRating={averageRating}
        unreadMessages={unreadMessages}
      />

      {/* Quick Actions Section */}
      <QuickActions />

      {/* Pending Bookings Section */}
      <div className="mb-6">
        <PendingBookings 
          bookings={bookings} 
          onApprovalUpdate={handleBookingUpdate}
        />
      </div>

      {/* Space Checklist */}
      {checklists.length > 0 && (
        <SpaceChecklist checklists={checklists} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <RecentBookings 
            bookings={bookings.filter(booking => booking.status !== 'pending')} 
            onBookingUpdate={handleBookingUpdate}
          />
          <RecentMessages messages={messages} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <RecentReviews 
            reviews={recentReviews} 
            averageRating={averageRating} 
          />
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
