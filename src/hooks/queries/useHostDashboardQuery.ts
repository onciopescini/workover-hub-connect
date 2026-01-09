import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BookingWithDetails } from "@/types/booking";
import { BookingReviewWithDetails } from "@/types/review";
import { Message } from "@/types/booking";
import { getUserReviews, getUserAverageRating } from "@/lib/review-utils";
import { Json } from "@/integrations/supabase/types";

// Query Keys
export const hostDashboardKeys = {
  all: ['hostDashboard'] as const,
  stats: (hostId: string) => [...hostDashboardKeys.all, 'stats', hostId] as const,
  bookings: (hostId: string) => [...hostDashboardKeys.all, 'bookings', hostId] as const,
  messages: (hostId: string) => [...hostDashboardKeys.all, 'messages', hostId] as const,
  reviews: (hostId: string) => [...hostDashboardKeys.all, 'reviews', hostId] as const,
  spaces: (hostId: string) => [...hostDashboardKeys.all, 'spaces', hostId] as const,
};

// Helper function to safely convert Json array to string array
const jsonArrayToStringArray = (jsonArray: Json[] | Json | null): string[] => {
  if (!jsonArray) return [];
  if (Array.isArray(jsonArray)) {
    return jsonArray.filter((item): item is string => typeof item === 'string');
  }
  return [];
};

// Fetch spaces count
const fetchSpacesCount = async (hostId: string): Promise<number> => {
  // Use workspaces instead of spaces
  const { data, error } = await (supabase
    .from("workspaces" as any) as any)
    .select("id", { count: 'exact' })
    .eq("host_id", hostId);

  if (error) throw error;
  return data?.length || 0;
};

// Fetch host bookings with details
const fetchHostBookings = async (hostId: string): Promise<BookingWithDetails[]> => {
  // Get host's spaces
  // Use workspaces instead of spaces
  const { data: workspacesData, error: spacesError } = await (supabase
    .from("workspaces" as any) as any)
    .select("id")
    .eq("host_id", hostId);

  if (spacesError) throw spacesError;

  const spaceIds = workspacesData?.map((s: any) => s.id) || [];
  if (spaceIds.length === 0) return [];

  // Fetch bookings for host spaces
  // Assuming bookings table still references 'spaces' via space_id which matches workspace.id
  // Note: We might encounter issues joining with 'spaces' table if it's deprecated.
  // The original code was joining `spaces!inner`. If we can't join `workspaces`, we might need to fetch workspace details separately or remove the inner join if the data is critical from it.
  // Ideally, bookings should link to workspaces. If not, and we need workspace details (title, address, etc.), we can manual fetch.
  // For now, let's assume we can fetch bookings by space_id, and manually fetch workspace details to populate the booking object.

  const { data: rawBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(`*`)
    .in("space_id", spaceIds)
    .order("booking_date", { ascending: true });

  if (bookingsError) throw bookingsError;

  if (!rawBookings || rawBookings.length === 0) return [];

  // Fetch workspace details for these bookings
  const { data: workspacesDetails, error: workspaceDetailsError } = await (supabase
    .from("workspaces" as any) as any)
    .select("id, name, address, photos, host_id, price_per_day")
    .in("id", spaceIds); // Fetch all relevant workspaces

  if (workspaceDetailsError) throw workspaceDetailsError;

  // Fetch coworker profiles
  const userIds = [...new Set(rawBookings.map(b => b.user_id))];
  const { data: coworkerProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, profile_photo_url")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  // Transform bookings
  return rawBookings.map(booking => {
    const coworkerProfile = coworkerProfiles?.find(p => p.id === booking.user_id);
    const workspace = workspacesDetails?.find((w: any) => w.id === booking.space_id);
    
    return {
      id: booking.id,
      space_id: booking.space_id,
      user_id: booking.user_id,
      booking_date: booking.booking_date,
      start_time: booking.start_time ?? '',
      end_time: booking.end_time ?? '',
      status: booking.status ?? 'pending',
      created_at: booking.created_at ?? '',
      updated_at: booking.updated_at ?? '',
      cancelled_at: booking.cancelled_at,
      cancellation_fee: booking.cancellation_fee,
      cancelled_by_host: booking.cancelled_by_host,
      cancellation_reason: booking.cancellation_reason,
      space: workspace ? {
        id: workspace.id,
        title: workspace.name, // Map name to title
        address: workspace.address,
        photos: workspace.photos || [],
        image_url: workspace.photos?.[0] || '',
        type: 'workspace',
        host_id: workspace.host_id,
        price_per_day: workspace.price_per_day
      } : {
        id: 'unknown',
        title: 'Unknown Space',
        address: '',
        photos: [],
        image_url: '',
        type: 'workspace',
        host_id: hostId,
        price_per_day: 0
      },
      coworker: coworkerProfile ? {
        id: coworkerProfile.id,
        first_name: coworkerProfile.first_name,
        last_name: coworkerProfile.last_name,
        profile_photo_url: coworkerProfile.profile_photo_url
      } : null
    };
  });
};

// Fetch host messages
const fetchHostMessages = async (hostId: string, bookings: BookingWithDetails[]): Promise<Message[]> => {
  if (bookings.length === 0) return [];

  const bookingIds = bookings.map(b => b.id);
  const { data: rawMessages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .in("booking_id", bookingIds)
    .neq("sender_id", hostId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (messagesError) throw messagesError;

  if (!rawMessages || rawMessages.length === 0) return [];

  // Fetch sender profiles
  const senderIds = [...new Set(rawMessages.map(m => m.sender_id))];
  const { data: senderProfiles, error: senderProfilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, profile_photo_url")
    .in("id", senderIds);

  if (senderProfilesError) throw senderProfilesError;

  // Transform messages
  return rawMessages.map(msg => {
    const senderProfile = senderProfiles?.find(p => p.id === msg.sender_id);
    
    return {
      id: msg.id,
      booking_id: msg.booking_id,
      sender_id: msg.sender_id,
      content: msg.content,
      attachments: jsonArrayToStringArray(msg.attachments),
      is_read: msg.is_read ?? false,
      created_at: msg.created_at ?? '',
      sender: senderProfile ? {
        first_name: senderProfile.first_name,
        last_name: senderProfile.last_name,
        profile_photo_url: senderProfile.profile_photo_url
      } : { first_name: '', last_name: '', profile_photo_url: null }
    };
  });
};

// Query hooks
export const useHostSpacesQuery = () => {
  const { authState } = useAuth();
  const isHost = authState.roles.includes('host') || authState.roles.includes('admin');
  
  return useQuery({
    queryKey: hostDashboardKeys.spaces(authState.user?.id || ''),
    queryFn: () => fetchSpacesCount(authState.user?.id || ''),
    enabled: !!authState.user?.id && isHost,
    staleTime: 60000, // 1 minute
  });
};

export const useHostBookingsQuery = () => {
  const { authState } = useAuth();
  const isHost = authState.roles.includes('host') || authState.roles.includes('admin');
  
  return useQuery({
    queryKey: hostDashboardKeys.bookings(authState.user?.id || ''),
    queryFn: () => fetchHostBookings(authState.user?.id || ''),
    enabled: !!authState.user?.id && isHost,
    staleTime: 30000, // 30 seconds
  });
};

export const useHostMessagesQuery = (bookings: BookingWithDetails[]) => {
  const { authState } = useAuth();
  const isHost = authState.roles.includes('host') || authState.roles.includes('admin');
  
  return useQuery({
    queryKey: hostDashboardKeys.messages(authState.user?.id || ''),
    queryFn: () => fetchHostMessages(authState.user?.id || '', bookings),
    enabled: !!authState.user?.id && isHost && bookings.length > 0,
    staleTime: 30000, // 30 seconds
  });
};

export const useHostReviewsQuery = () => {
  const { authState } = useAuth();
  const isHost = authState.roles.includes('host') || authState.roles.includes('admin');
  
  return useQuery({
    queryKey: hostDashboardKeys.reviews(authState.user?.id || ''),
    queryFn: async () => {
      if (!authState.user?.id) return { reviews: [], averageRating: null };
      
      const reviewsData = await getUserReviews(authState.user.id);
      const avgRating = await getUserAverageRating(authState.user.id);
      
      return {
        reviews: reviewsData.received,
        averageRating: avgRating
      };
    },
    enabled: !!authState.user?.id && isHost,
    staleTime: 60000, // 1 minute
  });
};
