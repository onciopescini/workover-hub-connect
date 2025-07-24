
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { HostDashboardMetrics } from "../types/hostDashboardTypes";

export const calculateHostMetrics = async (hostId: string): Promise<HostDashboardMetrics> => {
  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  // Get host spaces
  const { data: spaces } = await supabase
    .from('spaces')
    .select('id, title')
    .eq('host_id', hostId);

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

  // Get bookings with completed payments only
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      payments!inner (
        amount,
        host_amount,
        payment_status
      )
    `)
    .in('space_id', spaceIds)
    .eq('payments.payment_status', 'completed');

  const { data: currentMonthBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      payments!inner (
        amount,
        host_amount,
        payment_status
      )
    `)
    .in('space_id', spaceIds)
    .eq('payments.payment_status', 'completed')
    .gte('created_at', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
    .lte('created_at', format(endOfMonth(currentMonth), 'yyyy-MM-dd'));

  const { data: lastMonthBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      payments!inner (
        amount,
        host_amount,
        payment_status
      )
    `)
    .in('space_id', spaceIds)
    .eq('payments.payment_status', 'completed')
    .gte('created_at', format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
    .lte('created_at', format(endOfMonth(lastMonth), 'yyyy-MM-dd'));

  // Calculate metrics
  const totalBookings = bookings?.length || 0;
  const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;

  const totalRevenue = bookings?.reduce((sum, booking) => {
    const payment = Array.isArray(booking.payments) ? booking.payments[0] : booking.payments;
    // Per pagamenti legacy con host_amount null, calcola come amount / 1.05
    const hostAmount = payment?.host_amount ?? (payment?.amount ? payment.amount / 1.05 : 0);
    return sum + hostAmount;
  }, 0) || 0;

  const monthlyRevenue = currentMonthBookings?.reduce((sum, booking) => {
    const payment = Array.isArray(booking.payments) ? booking.payments[0] : booking.payments;
    // Per pagamenti legacy con host_amount null, calcola come amount / 1.05
    const hostAmount = payment?.host_amount ?? (payment?.amount ? payment.amount / 1.05 : 0);
    return sum + hostAmount;
  }, 0) || 0;

  const lastMonthRevenue = lastMonthBookings?.reduce((sum, booking) => {
    const payment = Array.isArray(booking.payments) ? booking.payments[0] : booking.payments;
    // Per pagamenti legacy con host_amount null, calcola come amount / 1.05
    const hostAmount = payment?.host_amount ?? (payment?.amount ? payment.amount / 1.05 : 0);
    return sum + hostAmount;
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
      // Per pagamenti legacy con host_amount null, calcola come amount / 1.05
      const hostAmount = payment?.host_amount ?? (payment?.amount ? payment.amount / 1.05 : 0);
      return sum + hostAmount;
    }, 0) || 0
  }));

  const topPerformingSpace = spaceRevenue.reduce((top, current) => 
    current.revenue > (top?.revenue || 0) ? current : top, { revenue: 0, id: '', title: '' });

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
};
