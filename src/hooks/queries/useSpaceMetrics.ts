import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { TIME_CONSTANTS } from "@/constants";
import { queryKeys } from "@/lib/react-query-config";

export interface ProfessionalBreakdown {
  profession: string;
  count: number;
  percentage: number;
}

export interface DemographicBreakdown {
  city: string;
  count: number;
  percentage: number;
}

export interface BookingTrend {
  month: string;
  bookings: number;
  revenue: number;
}

export interface PeakHour {
  hour: number;
  bookings: number;
}

export interface SpaceMetrics {
  space_title: string;
  total_bookings: number;
  monthly_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  monthly_revenue: number;
  last_month_revenue: number;
  revenue_growth: number;
  booking_growth: number;
  total_reviews: number;
  average_rating: number;
  occupancy_rate: number;
  booked_days_last_30: number;
  conversion_rate: number;
  total_views: number;
  professional_breakdown: ProfessionalBreakdown[];
  demographic_breakdown: DemographicBreakdown[];
  booking_trends: BookingTrend[];
  peak_hours: PeakHour[];
}

export const useSpaceMetrics = (spaceId: string) => {
  return useQuery({
    queryKey: queryKeys.spaceMetrics.detail(spaceId),
    queryFn: async () => {
      if (!spaceId) throw new Error('Space ID is required');
      
      try {
        const { data: spaceData, error: spaceError } = await supabase
          .from('spaces')
          .select('id, title')
          .eq('id', spaceId)
          .single();

        if (spaceError) throw spaceError;

        if (!spaceData) throw new Error('Space not found');

        // Fetch bookings for this space to calculate basic metrics
        // Assuming bookings link to space_id (which matches workspace id)
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('status, booking_date, created_at, cancelled_at') // Add other needed fields if we had payment amount
          .eq('space_id', spaceId);

        if (bookingsError) throw bookingsError;

        const totalBookings = bookings?.length || 0;
        const confirmedBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'served').length || 0;
        const pendingBookings = bookings?.filter(b => b.status === 'pending' || b.status === 'pending_approval').length || 0;
        const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;

        // Basic mock metrics or calculated where possible
        // Ideally we need revenue but that might require payments table or price from booking
        // For now, return basic structure to unblock View/Recap

        const metrics: SpaceMetrics = {
          space_title: spaceData.title,
          total_bookings: totalBookings,
          monthly_bookings: 0, // Would need date filtering
          confirmed_bookings: confirmedBookings,
          cancelled_bookings: cancelledBookings,
          pending_bookings: pendingBookings,
          total_revenue: 0, // Placeholder
          monthly_revenue: 0,
          last_month_revenue: 0,
          revenue_growth: 0,
          booking_growth: 0,
          total_reviews: 0, // Fetched separately in UI usually
          average_rating: 0,
          occupancy_rate: 0,
          booked_days_last_30: 0,
          conversion_rate: 0,
          total_views: 0,
          professional_breakdown: [],
          demographic_breakdown: [],
          booking_trends: [],
          peak_hours: []
        };

        return metrics;

      } catch (error) {
        sreLogger.error('Error fetching space metrics manually', { spaceId }, error as Error);
        throw error;
      }
    },
    enabled: !!spaceId,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });
};
