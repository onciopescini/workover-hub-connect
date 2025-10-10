import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  calculateKPIs, 
  calculateUserGrowth, 
  calculateBookingTrends,
  calculateRevenueTrends,
  calculateHostPerformance 
} from "@/lib/admin/admin-analytics-utils";

export function useAdminAnalytics(timeRange: "7d" | "30d" | "90d") {
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['admin-analytics-kpis', timeRange],
    queryFn: async () => {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, created_at, last_login_at')
        .gte('created_at', startDate.toISOString());

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, status, created_at')
        .gte('created_at', startDate.toISOString());

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('payment_status', 'completed')
        .gte('created_at', startDate.toISOString());

      return calculateKPIs(users || [], bookings || [], payments || [], days);
    },
  });

  // Fetch User Growth
  const { data: userGrowth, isLoading: userGrowthLoading } = useQuery({
    queryKey: ['admin-analytics-user-growth', timeRange],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at, role, last_login_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      return calculateUserGrowth(profiles || [], days);
    },
  });

  // Fetch Booking Trends
  const { data: bookingData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-analytics-bookings', timeRange],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          booking_date,
          space:spaces(id, city, category)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      return calculateBookingTrends(bookings || [], days);
    },
  });

  // Fetch Revenue Trends
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin-analytics-revenue', timeRange],
    queryFn: async () => {
      const { data: payments } = await supabase
        .from('payments')
        .select('id, amount, host_amount, platform_fee, method, created_at, user_id, booking_id')
        .eq('payment_status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: totalHosts } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'host');

      return calculateRevenueTrends(payments || [], totalUsers || 0, totalHosts || 0, days);
    },
  });

  // Fetch Host Performance
  const { data: hostPerformance, isLoading: hostsLoading } = useQuery({
    queryKey: ['admin-analytics-hosts', timeRange],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          space:spaces(
            id,
            host_id,
            title
          )
        `)
        .gte('created_at', startDate.toISOString());

      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          host_amount,
          booking:bookings(
            space:spaces(host_id)
          )
        `)
        .eq('payment_status', 'completed')
        .gte('created_at', startDate.toISOString());

      const { data: reviews } = await supabase
        .from('booking_reviews')
        .select(`
          rating,
          booking:bookings(
            space:spaces(host_id)
          )
        `);

      const { data: hosts } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'host');

      return calculateHostPerformance(
        bookings || [],
        payments || [],
        reviews || [],
        hosts || []
      );
    },
  });

  const isLoading = kpisLoading || userGrowthLoading || bookingsLoading || revenueLoading || hostsLoading;

  return {
    kpis,
    userGrowth,
    bookingTrends: bookingData?.trends,
    bookingsByCity: bookingData?.byCity,
    bookingsByCategory: bookingData?.byCategory,
    revenueTrends: revenueData?.trends,
    revenueBreakdown: revenueData?.breakdown,
    hostPerformance,
    isLoading,
  };
}
