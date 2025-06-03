import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LoadingScreen from "@/components/LoadingScreen";
import { MarketplaceLayout } from "@/components/layout/MarketplaceLayout";
import { DashboardStats } from "@/components/host/DashboardStats";
import { QuickActions } from "@/components/host/QuickActions";
import { RecentBookings } from "@/components/host/RecentBookings";
import { PendingBookings } from "@/components/host/PendingBookings";
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
          // 2. Fetch ALL bookings for host spaces (not just confirmed ones)
          const { data: rawBookings, error: bookingsError } = await supabase
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
              )
            `)
            .in("space_id", spaceIds)
            .order("booking_date", { ascending: true });

          if (bookingsError) {
            console.error('🔴 Error fetching bookings:', bookingsError);
            setActiveBookings(0);
            setRecentBookings([]);
          } else if (rawBookings && rawBookings.length > 0) {
            // 3. Fetch profiles for coworkers separately
            const userIds = [...new Set(rawBookings.map(b => b.user_id))];
            const { data: coworkerProfiles, error: profilesError } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, profile_photo_url")
              .in("id", userIds);

            if (profilesError) {
              console.error('🔴 Error fetching coworker profiles:', profilesError);
            }

            // 4. Combine bookings with profile data
            const transformedBookings: BookingWithDetails[] = rawBookings.map(booking => {
              const coworkerProfile = coworkerProfiles?.find(p => p.id === booking.user_id);
              
              return {
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
                coworker: coworkerProfile ? {
                  id: coworkerProfile.id,
                  first_name: coworkerProfile.first_name,
                  last_name: coworkerProfile.last_name,
                  profile_photo_url: coworkerProfile.profile_photo_url
                } : null
              };
            });

            // Count only confirmed bookings for active bookings stat
            const confirmedBookings = transformedBookings.filter(
              booking => booking.status === 'confirmed' && 
              new Date(booking.booking_date) >= new Date().setHours(0, 0, 0, 0)
            );
            
            setActiveBookings(confirmedBookings.length);
            setRecentBookings(transformedBookings);
            console.log('🔵 Found total bookings:', transformedBookings.length);
            console.log('🔵 Found active confirmed bookings:', confirmedBookings.length);

            // 5. Fetch messages without profile joins
            const bookingIds = transformedBookings.map(b => b.id);
            const { data: rawMessages, error: messagesError } = await supabase
              .from("messages")
              .select("*")
              .in("booking_id", bookingIds)
              .neq("sender_id", authState.user.id)
              .order("created_at", { ascending: false })
              .limit(10);

            if (messagesError) {
              console.error('🔴 Error fetching messages:', messagesError);
              setRecentMessages([]);
              setUnreadMessages(0);
            } else if (rawMessages && rawMessages.length > 0) {
              // 6. Fetch sender profiles separately
              const senderIds = [...new Set(rawMessages.map(m => m.sender_id))];
              const { data: senderProfiles, error: senderProfilesError } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, profile_photo_url")
                .in("id", senderIds);

              if (senderProfilesError) {
                console.error('🔴 Error fetching sender profiles:', senderProfilesError);
              }

              // 7. Combine messages with sender data
              const transformedMessages: Message[] = rawMessages.map(msg => {
                const senderProfile = senderProfiles?.find(p => p.id === msg.sender_id);
                
                return {
                  id: msg.id,
                  booking_id: msg.booking_id,
                  sender_id: msg.sender_id,
                  content: msg.content,
                  attachments: jsonArrayToStringArray(msg.attachments),
                  is_read: msg.is_read,
                  created_at: msg.created_at,
                  sender: senderProfile ? {
                    first_name: senderProfile.first_name,
                    last_name: senderProfile.last_name,
                    profile_photo_url: senderProfile.profile_photo_url
                  } : undefined
                };
              });

              setRecentMessages(transformedMessages);
              setUnreadMessages(transformedMessages.filter(m => !m.is_read).length);
              console.log('🔵 Found messages:', transformedMessages.length);
            } else {
              setRecentMessages([]);
              setUnreadMessages(0);
            }

            // 8. Fetch checklist status for first space (demo)
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
          } else {
            // No bookings found
            setActiveBookings(0);
            setRecentBookings([]);
            setRecentMessages([]);
            setUnreadMessages(0);
          }
        } else {
          // No spaces, set empty data
          setActiveBookings(0);
          setRecentBookings([]);
          setRecentMessages([]);
          setUnreadMessages(0);
          setChecklists([]);
        }

        // 9. Fetch reviews and average rating for host
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
    <div className="container mx-auto py-6 px-4">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Host</h1>
        <p className="text-gray-600">Benvenuto, {authState.profile?.first_name || "Host"}</p>
      </div>

      {/* Welcome Message for New Hosts */}
      {isNewHost && <WelcomeMessage />}

      {/* Stripe Setup Section - Using the new StripeSetupFixed component */}
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

      {/* Pending Bookings Section - New Addition */}
      <div className="mb-6">
        <PendingBookings 
          bookings={recentBookings} 
          onApprovalUpdate={handleBookingUpdate}
        />
      </div>

      {/* Space Checklist - Show only if there are checklist items */}
      {checklists.length > 0 && (
        <SpaceChecklist checklists={checklists} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <RecentBookings 
            bookings={recentBookings.filter(booking => booking.status !== 'pending')} 
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
  );
};

export default HostDashboard;
