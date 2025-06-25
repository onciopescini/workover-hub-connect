
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface HostDashboardMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  occupancyRate: number;
  averageBookingValue: number;
  revenueGrowth: number;
  topPerformingSpace: {
    id: string;
    title: string;
    revenue: number;
  } | null;
}

export interface RecentActivity {
  id: string;
  type: 'booking' | 'message' | 'review';
  title: string;
  description: string;
  created_at: string;
  metadata: any;
}

const useEnhancedHostDashboard = () => {
  const { authState } = useAuth();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['host-dashboard-metrics', authState.user?.id],
    queryFn: async (): Promise<HostDashboardMetrics> => {
      if (!authState.user?.id) throw new Error('No authenticated user');

      const currentMonth = new Date();
      const lastMonth = subMonths(currentMonth, 1);

      // Get host spaces
      const { data: spaces } = await supabase
        .from('spaces')
        .select('id, title')
        .eq('host_id', authState.user.id);

      if (!spaces || spaces.length === 0) {
        return {
          totalRevenue: 0,
          monthlyRevenue: 0,
          totalBookings: 0,
          pendingBookings: 0,
          confirmedBookings: 0,
          occupancyRate: 0,
          averageBookingValue: 0,
          revenueGrowth: 0,
          topPerformingSpace: null,
        };
      }

      const spaceIds = spaces.map(s => s.id);

      // Get bookings with payments
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          payments (
            amount,
            host_amount,
            payment_status
          )
        `)
        .in('space_id', spaceIds);

      const { data: currentMonthBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          payments (
            amount,
            host_amount,
            payment_status
          )
        `)
        .in('space_id', spaceIds)
        .gte('created_at', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
        .lte('created_at', format(endOfMonth(currentMonth), 'yyyy-MM-dd'));

      const { data: lastMonthBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          payments (
            amount,
            host_amount,
            payment_status
          )
        `)
        .in('space_id', spaceIds)
        .gte('created_at', format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
        .lte('created_at', format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

      // Calculate metrics
      const totalBookings = bookings?.length || 0;
      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;

      const totalRevenue = bookings?.reduce((sum, booking) => {
        const payment = Array.isArray(booking.payments) ? booking.payments[0] : booking.payments;
        return sum + (payment?.host_amount || 0);
      }, 0) || 0;

      const monthlyRevenue = currentMonthBookings?.reduce((sum, booking) => {
        const payment = Array.isArray(booking.payments) ? booking.payments[0] : booking.payments;
        return sum + (payment?.host_amount || 0);
      }, 0) || 0;

      const lastMonthRevenue = lastMonthBookings?.reduce((sum, booking) => {
        const payment = Array.isArray(booking.payments) ? booking.payments[0] : booking.payments;
        return sum + (payment?.host_amount || 0);
      }, 0) || 0;

      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const averageBookingValue = confirmedBookings > 0 ? totalRevenue / confirmedBookings : 0;

      // Calculate occupancy rate (simplified)
      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
      const totalAvailableDays = spaces.length * daysInMonth;
      const bookedDays = currentMonthBookings?.filter(b => b.status === 'confirmed').length || 0;
      const occupancyRate = totalAvailableDays > 0 ? (bookedDays / totalAvailableDays) * 100 : 0;

      // Find top performing space
      const spaceRevenue = spaces.map(space => ({
        ...space,
        revenue: bookings?.filter(b => b.space_id === space.id).reduce((sum, booking) => {
          const payment = Array.isArray(booking.payments) ? booking.payments[0] : booking.payments;
          return sum + (payment?.host_amount || 0);
        }, 0) || 0
      }));

      const topPerformingSpace = spaceRevenue.reduce((top, current) => 
        current.revenue > (top?.revenue || 0) ? current : top, null);

      return {
        totalRevenue,
        monthlyRevenue,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        occupancyRate,
        averageBookingValue,
        revenueGrowth,
        topPerformingSpace,
      };
    },
    enabled: !!authState.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['host-recent-activity', authState.user?.id],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (!authState.user?.id) return [];

      const activities: RecentActivity[] = [];

      // Get recent bookings
      const { data: recentBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          spaces (title),
          profiles (first_name, last_name)
        `)
        .eq('spaces.host_id', authState.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent messages
      const { data: recentMessages } = await supabase
        .from('messages')
        .select(`
          *,
          bookings!inner (
            spaces!inner (
              host_id,
              title
            )
          ),
          profiles (first_name, last_name)
        `)
        .eq('bookings.spaces.host_id', authState.user.id)
        .neq('sender_id', authState.user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Add booking activities
      recentBookings?.forEach(booking => {
        activities.push({
          id: booking.id,
          type: 'booking',
          title: `Nuova prenotazione da ${booking.profiles?.first_name} ${booking.profiles?.last_name}`,
          description: `Prenotazione per ${booking.spaces?.title} - ${booking.booking_date}`,
          created_at: booking.created_at,
          metadata: { booking_id: booking.id, status: booking.status }
        });
      });

      // Add message activities
      recentMessages?.forEach(message => {
        activities.push({
          id: message.id,
          type: 'message',
          title: `Nuovo messaggio da ${message.profiles?.first_name} ${message.profiles?.last_name}`,
          description: message.content.substring(0, 100) + '...',
          created_at: message.created_at,
          metadata: { booking_id: message.booking_id }
        });
      });

      return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
    },
    enabled: !!authState.user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    metrics,
    recentActivity: recentActivity || [],
    isLoading: metricsLoading || activityLoading,
  };
};

export default useEnhancedHostDashboard;
