
import { supabase } from "@/integrations/supabase/client";
import { HostDashboardMetrics } from "../types/hostDashboardTypes";
import { sreLogger } from '@/lib/sre-logger';
import { Database } from "@/integrations/supabase/types";

// Type definition for Booking Status based on Supabase types
type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const calculateHostMetrics = async (hostId: string): Promise<HostDashboardMetrics> => {
  try {
    // 1. Fetch Workspaces
    // 'workspaces' table is not yet in the auto-generated types, so we cast to any
    const { data: workspaces, error: spacesError } = await (supabase
      .from('workspaces' as any)
      .select('id, name')
      .eq('host_id', hostId)) as any;

    if (spacesError) throw spacesError;

    if (!workspaces || workspaces.length === 0) {
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

    const spaceIds = workspaces.map((ws: any) => ws.id);
    const spaceMap = new Map(workspaces.map((ws: any) => [ws.id, ws.name]));

    // 2. Fetch Bookings
    // We need confirmed/served for revenue, and pending for the counter.
    // We fetch all relevant statuses.
    const relevantStatuses: BookingStatus[] = ['confirmed', 'served', 'pending'];

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, space_id, status, booking_date, created_at')
      .in('space_id', spaceIds)
      .in('status', relevantStatuses);

    if (bookingsError) throw bookingsError;

    const confirmedOrServedBookings = bookings?.filter(b => b.status === 'confirmed' || b.status === 'served') || [];
    const pendingBookingsCount = bookings?.filter(b => b.status === 'pending').length || 0;
    const confirmedBookingIds = confirmedOrServedBookings.map(b => b.id);

    // 3. Fetch Payments
    // Only for confirmed/served bookings
    let payments: any[] = [];
    if (confirmedBookingIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, host_amount, booking_id, created_at, payment_status')
        .in('booking_id', confirmedBookingIds)
        .eq('payment_status', 'completed'); // Only completed payments count towards revenue

      if (paymentsError) throw paymentsError;
      payments = paymentsData || [];
    }

    // 4. Calculate Metrics
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let lastMonthRevenue = 0;
    let spaceRevenueMap = new Map<string, number>();

    payments.forEach(payment => {
      // Logic: host_amount ?? (amount / 1.05)
      const revenue = payment.host_amount !== null
        ? payment.host_amount
        : (payment.amount / 1.05);

      totalRevenue += revenue;

      // Group revenue by space for top performer
      const booking = confirmedOrServedBookings.find(b => b.id === payment.booking_id);
      if (booking && booking.space_id) {
        const currentSpaceRev = spaceRevenueMap.get(booking.space_id) || 0;
        spaceRevenueMap.set(booking.space_id, currentSpaceRev + revenue);
      }

      // Monthly Revenue (Current Month)
      const paymentDate = new Date(payment.created_at);
      if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
        monthlyRevenue += revenue;
      }

      // Last Month Revenue (for Growth)
      if (paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === lastMonthYear) {
        lastMonthRevenue += revenue;
      }
    });

    // Revenue Growth
    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
      revenueGrowth = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (monthlyRevenue > 0) {
      revenueGrowth = 100; // If last month was 0 and this month > 0, 100% growth (or just show positive)
    }

    // Top Performing Space
    let topSpaceId: string | null = null;
    let maxRevenue = -1;
    for (const [spaceId, rev] of spaceRevenueMap.entries()) {
      if (rev > maxRevenue) {
        maxRevenue = rev;
        topSpaceId = spaceId;
      }
    }
    
    const topPerformingSpace = topSpaceId ? {
      id: topSpaceId,
      title: (spaceMap.get(topSpaceId) || 'Unknown Space') as string,
      revenue: maxRevenue
    } : null;

    // Average Booking Value
    const confirmedCount = confirmedOrServedBookings.length;
    const averageBookingValue = confirmedCount > 0 ? totalRevenue / confirmedCount : 0;

    // Occupancy Rate (Simplified)
    // Legacy: (confirmed_bookings_current_month / (space_count * days_in_month)) * 100
    // We will calculate confirmed bookings in current month
    const confirmedBookingsThisMonth = confirmedOrServedBookings.filter(b => {
      const d = new Date(b.booking_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const potentialBookings = workspaces.length * daysInCurrentMonth;
    const occupancyRate = potentialBookings > 0
      ? (confirmedBookingsThisMonth / potentialBookings) * 100
      : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      totalBookings: bookings?.length || 0, // Counts pending + confirmed + served
      pendingBookings: pendingBookingsCount,
      confirmedBookings: confirmedCount,
      occupancyRate,
      averageBookingValue,
      revenueGrowth,
      topPerformingSpace,
    };

  } catch (error) {
    sreLogger.error('Error calculating host metrics', { hostId }, error as Error);
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
};
