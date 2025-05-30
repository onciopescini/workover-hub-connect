
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LoadingScreen from "@/components/LoadingScreen";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardStats } from "@/components/host/DashboardStats";
import { QuickActions } from "@/components/host/QuickActions";
import { RecentBookings } from "@/components/host/RecentBookings";
import { RecentMessages } from "@/components/host/RecentMessages";
import { RecentReviews } from "@/components/host/RecentReviews";
import { SpaceChecklist } from "@/components/host/SpaceChecklist";
import { StripeSetupFixed } from "@/components/host/StripeSetupFixed";
import { WelcomeMessage } from "@/components/host/WelcomeMessage";
import { BookingWithDetails } from "@/types/booking";
import { ReviewWithDetails } from "@/types/review";
import { Message } from "@/types/booking";
import { getUserReviews, getUserAverageRating } from "@/lib/review-utils";
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
        console.log('🔵 Fetching dashboard data for host:', authState.user.id);

        // 1. Fetch spaces count for current host
        const { data: spacesData, error: spacesError } = await supabase
          .from("spaces")
          .select("id")
          .eq("host_id", authState.user.id);

        if (spacesError) {
          console.error('🔴 Error fetching spaces:', spacesError);
          throw spacesError;
        }

        const spaceIds = spacesData?.map(s => s.id) || [];
        setTotalSpaces(spaceIds.length);
        console.log('🔵 Found spaces:', spaceIds.length);

        if (spaceIds.length > 0) {
          // 2. Fetch active bookings for host's spaces - Query corretta con single relation
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings")
            .select(`
              *,
              spaces!inner (
                id,
                title,
                address,
                photos,
                host_id,
                price_per_day
              ),
              profiles!bookings_user_id_fkey (
                id,
                first_name,
                last_name,
                profile_photo_url
              )
            `)
            .in("space_id", spaceIds)
            .eq("status", "confirmed")
            .gte("booking_date", new Date().toISOString().split('T')[0])
            .order("booking_date", { ascending: true });

          if (bookingsError) {
            console.error('🔴 Error fetching bookings:', bookingsError);
            setActiveBookings(0);
            setRecentBookings([]);
          } else {
            // Transform data to match BookingWithDetails interface
            const transformedBookings: BookingWithDetails[] = (bookingsData || []).map(booking => ({
              id: booking.id,
              space_id: booking.space_id,
              user_id: booking.user_id,
              booking_date: booking.booking_date,
              start_time: booking.start_time,
              end_time: booking.end_time,
              status: booking.status,
              created_at: booking.created_at,
              updated_at: booking.updated_at,
              cancelled_at: booking.cancelled_at,
              cancellation_fee: booking.cancellation_fee,
              cancelled_by_host: booking.cancelled_by_host,
              cancellation_reason: booking.cancellation_reason,
              space: {
                id: booking.spaces.id,
                title: booking.spaces.title,
                address: booking.spaces.address,
                photos: booking.spaces.photos,
                host_id: booking.spaces.host_id,
                price_per_day: booking.spaces.price_per_day
              },
              coworker: booking.profiles ? {
                id: booking.profiles.id,
                first_name: booking.profiles.first_name,
                last_name: booking.profiles.last_name,
                profile_photo_url: booking.profiles.profile_photo_url
              } : null
            }));

            setActiveBookings(transformedBookings.length);
            setRecentBookings(transformedBookings);
            console.log('🔵 Found active bookings:', transformedBookings.length);

            // 3. Fetch recent messages for host's bookings con JOIN corretto
            if (transformedBookings.length > 0) {
              const bookingIds = transformedBookings.map(b => b.id);
              const { data: messagesData, error: messagesError } = await supabase
                .from("messages")
                .select(`
                  id,
                  booking_id,
                  sender_id,
                  content,
                  attachments,
                  is_read,
                  created_at,
                  profiles!messages_sender_id_fkey (
                    id,
                    first_name,
                    last_name,
                    profile_photo_url
                  )
                `)
                .in("booking_id", bookingIds)
                .neq("sender_id", authState.user.id)
                .order("created_at", { ascending: false })
                .limit(10);

              if (messagesError) {
                console.error('🔴 Error fetching messages:', messagesError);
                setRecentMessages([]);
                setUnreadMessages(0);
              } else {
                // Transform messages con conversione corretta degli attachments
                const transformedMessages: Message[] = (messagesData || []).map(msg => ({
                  id: msg.id,
                  booking_id: msg.booking_id,
                  sender_id: msg.sender_id,
                  content: msg.content,
                  attachments: jsonArrayToStringArray(msg.attachments),
                  is_read: msg.is_read,
                  created_at: msg.created_at,
                  sender: msg.profiles ? {
                    first_name: msg.profiles.first_name,
                    last_name: msg.profiles.last_name,
                    profile_photo_url: msg.profiles.profile_photo_url
                  } : undefined
                }));

                setRecentMessages(transformedMessages);
                setUnreadMessages(transformedMessages.filter(m => !m.is_read).length);
                console.log('🔵 Found messages:', transformedMessages.length);
              }
            }

            // 4. Fetch checklist status for first space (demo)
            const { data: checklistData, error: checklistError } = await supabase
              .from("checklists")
              .select("*")
              .eq("space_id", spaceIds[0]);

            if (checklistError) {
              console.error('🔴 Error fetching checklist:', checklistError);
              setChecklists([]);
            } else {
              setChecklists(checklistData || []);
            }
          }
        } else {
          // No spaces, set empty data
          setActiveBookings(0);
          setRecentBookings([]);
          setRecentMessages([]);
          setUnreadMessages(0);
          setChecklists([]);
        }

        // 5. Fetch reviews and average rating for host
        try {
          const reviewsData = await getUserReviews(authState.user.id);
          setRecentReviews(reviewsData.received);
          
          const avgRating = await getUserAverageRating(authState.user.id);
          setAverageRating(avgRating);
          console.log('🔵 Reviews and rating loaded');
        } catch (reviewError) {
          console.error('🔴 Error fetching reviews:', reviewError);
          setRecentReviews([]);
          setAverageRating(null);
        }

      } catch (error) {
        console.error("🔴 Error fetching dashboard data:", error);
        toast.error("Errore nel caricamento della dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [authState.user]);

  // Function to refresh bookings after updates
  const handleBookingUpdate = () => {
    window.location.reload(); // Simple refresh for now
  };

  // Show loading screen while data is being fetched
  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  // Redirect non-hosts
  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <AppLayout 
      title="Dashboard Host" 
      subtitle={`Benvenuto, ${authState.profile?.first_name || "Host"}`}
      showBackButton={false}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-6">
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

        {/* Space Checklist - Show only if there are checklist items */}
        {checklists.length > 0 && (
          <SpaceChecklist checklists={checklists} />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <RecentBookings 
              bookings={recentBookings} 
              onBookingUpdate={handleBookingUpdate}
            />
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
    </AppLayout>
  );
};

export default HostDashboard;
