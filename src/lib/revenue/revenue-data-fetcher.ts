
import { supabase } from "@/integrations/supabase/client";
import { RevenueData } from "../types/host-revenue-types";
import { sreLogger } from '@/lib/sre-logger';

export const getHostRevenueData = async (
  hostId: string,
  year: string,
  month: string = "all"
): Promise<RevenueData> => {
  // Build date filters
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  
  let dateFilter = `AND p.created_at >= '${yearStart}' AND p.created_at <= '${yearEnd}'`;
  
  if (month !== "all") {
    const monthStart = `${year}-${month.padStart(2, '0')}-01`;
    const monthEnd = new Date(parseInt(year), parseInt(month), 0).getDate();
    const monthEndDate = `${year}-${month.padStart(2, '0')}-${monthEnd}`;
    dateFilter = `AND p.created_at >= '${monthStart}' AND p.created_at <= '${monthEndDate}'`;
  }

  // Get all payments for host spaces with space details
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      host_amount,
      created_at,
      booking_id,
      payment_status,
      bookings!inner (
        id,
        space_id,
        spaces!inner (
          id,
          title,
          host_id
        )
      )
    `)
    .eq('bookings.spaces.host_id', hostId)
    .eq('payment_status', 'completed')
    .gte('created_at', yearStart)
    .lte('created_at', yearEnd)
    .order('created_at', { ascending: false });

  if (paymentsError) {
    sreLogger.error('Error fetching payments', { error: paymentsError, hostId, year, month });
    throw paymentsError;
  }

  // Filter by month if specified
  let filteredPayments = payments || [];
  if (month !== "all") {
    filteredPayments = filteredPayments.filter(payment => {
      const paymentMonth = new Date(payment.created_at || new Date()).getMonth() + 1;
      return paymentMonth === parseInt(month);
    });
  }

  // Calculate totals
  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + (payment.host_amount || 0), 0);
  const totalBookings = filteredPayments.length;

  // Format recent payouts
  const recentPayouts = filteredPayments.map(payment => ({
    id: payment.id,
    amount: payment.host_amount || 0,
    date: payment.created_at || '',
    booking_id: payment.booking_id,
    space_title: payment.bookings?.spaces?.title || 'N/A'
  }));

  // Calculate monthly revenue for the year
  const monthlyRevenue = [];
  for (let m = 1; m <= 12; m++) {
    const monthPayments = (payments || []).filter(payment => {
      const paymentMonth = new Date(payment.created_at || new Date()).getMonth() + 1;
      return paymentMonth === m;
    });
    
    monthlyRevenue.push({
      month: new Date(parseInt(year), m - 1).toLocaleDateString('it-IT', { month: 'short' }),
      revenue: monthPayments.reduce((sum, p) => sum + (p.host_amount || 0), 0),
      bookings: monthPayments.length
    });
  }

  return {
    totalRevenue,
    totalBookings,
    recentPayouts,
    monthlyRevenue
  };
};
