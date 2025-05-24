
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LoadingScreen from "@/components/LoadingScreen";
import { DashboardStats } from "@/components/host/DashboardStats";
import { QuickActions } from "@/components/host/QuickActions";
import { RecentBookings } from "@/components/host/RecentBookings";
import { RecentMessages } from "@/components/host/RecentMessages";
import { RecentReviews } from "@/components/host/RecentReviews";
import { SpaceChecklist } from "@/components/host/SpaceChecklist";
import { StripeSetup } from "@/components/host/StripeSetup";
import { WelcomeMessage } from "@/components/host/WelcomeMessage";
import { BookingWithDetails } from "@/types/booking";
import { ReviewWithDetails } from "@/types/review";
import { Message } from "@/types/booking";
import { getUserReviews, getUserAverageRating } from "@/lib/review-utils";

interface ChecklistItem {
  id: string;
  section: string;
  completed: boolean;
}

const HostDashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isNewHost, setIsNewHost] = useState(false);
  
  // Dashboard data states
  const [totalSpaces, setTotalSpaces] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [recentBookings, setRecentBookings] = useState<BookingWithDetails[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewWithDetails[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);

  // Redirect non-hosts to regular dashboard
  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  // Check if this is a new host (recently completed onboarding)
  useEffect(() => {
    if (authState.profile?.onboarding_completed) {
      const onboardingDate = new Date(authState.profile.updated_at);
      const now = new Date();
      const hoursSinceOnboarding = (now.getTime() - onboardingDate.getTime()) / (1000 * 60 * 60);
      
      // Show welcome message if onboarding was completed in the last 24 hours
      setIsNewHost(hoursSinceOnboarding < 24);
    }
  }, [authState.profile]);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!authState.user) return;

      try {
        // 1. Fetch spaces count for current host
        const { data: spacesData, error: spacesError } = await supabase
          .from("spaces")
          .select("id")
          .eq("host_id", authState.user.id);

        if (spacesError) throw spacesError;
        const spaceIds = spacesData?.map(s => s.id) || [];
        setTotalSpaces(spaceIds.length);

        if (spaceIds.length > 0) {
          // 2. Fetch active bookings for host's spaces
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings")
            .select(`
              *,
              space:space_id (
                title,
                address,
                photos
              ),
              coworker:user_id (
                first_name,
                last_name,
                profile_photo_url
              )
            `)
            .in("space_id", spaceIds)
            .eq("status", "confirmed")
            .gte("booking_date", new Date().toISOString().split('T')[0])
            .order("booking_date", { ascending: true });

          if (bookingsError) throw bookingsError;
          setActiveBookings(bookingsData?.length || 0);
          setRecentBookings(bookingsData as unknown as BookingWithDetails[] || []);

          // 3. Fetch recent messages for host's bookings
          const { data: messagesData, error: messagesError } = await supabase
            .from("messages")
            .select(`
              *,
              sender:sender_id (
                first_name,
                last_name,
                profile_photo_url
              )
            `)
            .in("booking_id", bookingsData?.map(b => b.id) || [])
            .neq("sender_id", authState.user.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (messagesError) throw messagesError;
          const messages = messagesData as unknown as Message[] || [];
          setRecentMessages(messages);
          setUnreadMessages(messages.filter(m => !m.is_read).length);

          // 4. Fetch checklist status for first space (demo)
          if (spaceIds.length > 0) {
            const { data: checklistData, error: checklistError } = await supabase
              .from("checklists")
              .select("*")
              .eq("space_id", spaceIds[0]);

            if (checklistError) throw checklistError;
            setChecklists(checklistData || []);
          }
        }

        // 5. Fetch reviews and average rating for host
        const reviewsData = await getUserReviews(authState.user.id);
        setRecentReviews(reviewsData.received);
        
        const avgRating = await getUserAverageRating(authState.user.id);
        setAverageRating(avgRating);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Errore nel caricamento della dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [authState.user]);

  // Show loading screen while data is being fetched
  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  // Redirect non-hosts
  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard Host
          </h1>
          <p className="text-gray-600 mt-1">
            Benvenuto, {authState.profile?.first_name || "Host"}
          </p>
        </div>

        {/* Welcome Message for New Hosts */}
        {isNewHost && <WelcomeMessage />}

        {/* Stripe Setup Section */}
        <div data-stripe-setup>
          <StripeSetup />
        </div>

        {/* Statistics Cards - Full width responsive grid */}
        <DashboardStats 
          totalSpaces={totalSpaces}
          activeBookings={activeBookings}
          averageRating={averageRating}
          unreadMessages={unreadMessages}
        />

        {/* Quick Actions Section */}
        <QuickActions />

        {/* Space Checklist - Show only if there are checklist items */}
        {checklists.length > 0 && (
          <SpaceChecklist checklists={checklists} />
        )}

        {/* Main Content Grid - Two columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <RecentBookings bookings={recentBookings} />
            <RecentMessages messages={recentMessages} />
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
    </div>
  );
};

export default HostDashboard;
