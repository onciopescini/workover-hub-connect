import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { TIME_CONSTANTS } from "@/constants";

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
    queryKey: ['space-metrics', spaceId],
    queryFn: async () => {
      if (!spaceId) throw new Error('Space ID is required');
      
      const { data, error } = await supabase.rpc('get_single_space_metrics', {
        space_id_param: spaceId
      });

      if (error) {
        sreLogger.error('Error fetching space metrics', { spaceId }, error);
        throw error;
      }

      if (!data) {
        throw new Error('Space not found');
      }

      // Check if data is an error object
      if (typeof data === 'object' && data !== null && 'error' in data) {
        throw new Error((data as any).error || 'Space not found');
      }

      return data as unknown as SpaceMetrics;
    },
    enabled: !!spaceId,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });
};