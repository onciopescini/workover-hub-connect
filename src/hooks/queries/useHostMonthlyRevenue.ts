import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlyRevenueData, HostAnalyticsKPIs } from '@/types/host-analytics';

interface UseHostMonthlyRevenueOptions {
  hostId: string;
  monthsBack?: number;
  enabled?: boolean;
}

interface UseHostMonthlyRevenueReturn {
  data: MonthlyRevenueData[];
  kpis: HostAnalyticsKPIs;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Define the RPC response shape
interface RpcRevenueRow {
  month_label: string;
  month_year: string;
  year_num: number;
  month_num: number;
  total_revenue: number;
  booking_count: number;
  avg_booking_value: number;
  platform_fees: number;
}

/**
 * Hook to fetch monthly revenue data for a host
 * Uses the get_host_monthly_revenue RPC function
 */
export function useHostMonthlyRevenue({
  hostId,
  monthsBack = 12,
  enabled = true,
}: UseHostMonthlyRevenueOptions): UseHostMonthlyRevenueReturn {
  const query = useQuery({
    queryKey: ['host-monthly-revenue', hostId, monthsBack],
    queryFn: async (): Promise<MonthlyRevenueData[]> => {
      // Use generic RPC call since function may not be in types yet
      const { data, error } = await supabase
        .rpc('get_host_monthly_revenue' as never, {
          host_uuid: hostId,
          months_back: monthsBack,
        } as never);

      if (error) {
        console.error('[useHostMonthlyRevenue] RPC Error:', error);
        throw new Error(error.message);
      }

      // Type guard and normalize
      const rows = data as RpcRevenueRow[] | null;
      if (!rows || !Array.isArray(rows)) {
        return [];
      }

      return rows.map((row) => ({
        month_label: String(row.month_label ?? ''),
        month_year: String(row.month_year ?? ''),
        year_num: Number(row.year_num) || 0,
        month_num: Number(row.month_num) || 0,
        total_revenue: Number(row.total_revenue) || 0,
        booking_count: Number(row.booking_count) || 0,
        avg_booking_value: Number(row.avg_booking_value) || 0,
        platform_fees: Number(row.platform_fees) || 0,
      }));
    },
    enabled: !!hostId && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });

  // Calculate aggregated KPIs from the data
  const kpis = calculateKPIs(query.data || []);

  return {
    data: query.data || [],
    kpis,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/**
 * Calculate aggregated KPIs from monthly data
 */
function calculateKPIs(data: MonthlyRevenueData[]): HostAnalyticsKPIs {
  if (data.length === 0) {
    return {
      totalRevenue: 0,
      totalBookings: 0,
      avgBookingValue: 0,
      totalPlatformFees: 0,
      revenueChange: 0,
      bookingsChange: 0,
    };
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.total_revenue, 0);
  const totalBookings = data.reduce((sum, d) => sum + d.booking_count, 0);
  const totalPlatformFees = data.reduce((sum, d) => sum + d.platform_fees, 0);
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Calculate change (compare last month to previous month)
  let revenueChange = 0;
  let bookingsChange = 0;

  if (data.length >= 2) {
    const lastMonth = data[data.length - 1];
    const prevMonth = data[data.length - 2];

    if (lastMonth && prevMonth) {
      if (prevMonth.total_revenue > 0) {
        revenueChange = ((lastMonth.total_revenue - prevMonth.total_revenue) / prevMonth.total_revenue) * 100;
      }
      if (prevMonth.booking_count > 0) {
        bookingsChange = ((lastMonth.booking_count - prevMonth.booking_count) / prevMonth.booking_count) * 100;
      }
    }
  }

  return {
    totalRevenue,
    totalBookings,
    avgBookingValue,
    totalPlatformFees,
    revenueChange,
    bookingsChange,
  };
}
