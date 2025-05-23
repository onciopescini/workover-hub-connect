
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
import { BookingWithDetails } from "@/types/booking";
import { ReviewWithDetails } from "@/types/review";
import { Message } from "@/types/booking";
import { getUserReviews, getUserAverageRating } from "@/lib/review-utils";

interface ChecklistItem {
  id: string;
  section: string;
  completed: boolean;
}

const HostDashboardNew = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Dashboard data
  const [totalSpaces, setTotalSpaces] = useState(0);
  const [activeBookings, setActiveBookings] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [recentBookings, setRecentBookings] = useState<BookingWithDetails[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [recentReviews, setRecentReviews] = useState<ReviewWithDetails[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);

  // Redirect non-hosts
  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!authState.user) return;

      try {
        // Fetch spaces count
        const { data: spacesData, error: spacesError } = await supabase
          .from("spaces")
          .select("id")
          .eq("host_id", authState.user.id);

        if (spacesError) throw spacesError;
        const spaceIds = spacesData?.map(s => s.id) || [];
        setTotalSpaces(spaceIds.length);

        if (spaceIds.length > 0) {
          // Fetch active bookings
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

          // Fetch recent messages
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

          // Fetch checklists for first space
          if (spaceIds.length > 0) {
            const { data: checklistData, error: checklistError } = await supabase
              .from("checklists")
              .select("*")
              .eq("space_id", spaceIds[0]);

            if (checklistError) throw checklistError;
            setChecklists(checklistData || []);
          }
        }

        // Fetch reviews and average rating
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

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard Host
          </h1>
          <p className="text-gray-600 mt-1">
            Benvenuto, {authState.profile?.first_name || "Host"}
          </p>
        </div>

        {/* Statistics Cards */}
        <DashboardStats 
          totalSpaces={totalSpaces}
          activeBookings={activeBookings}
          averageRating={averageRating}
          unreadMessages={unreadMessages}
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Space Checklist */}
        {checklists.length > 0 && (
          <SpaceChecklist checklists={checklists} />
        )}

        {/* Main Content Grid */}
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

export default HostDashboardNew;
