import { supabase } from "@/integrations/supabase/client";

export interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
}

export interface RevenueByCategory {
  name: string;
  value: number;
  color: string;
}

export interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageBookingValue: number;
  occupancyRate: number;
  monthlyData: MonthlyData[];
  revenueByCategory: RevenueByCategory[];
}

export const getHostFinancialMetrics = async (hostId: string, year: number = new Date().getFullYear()): Promise<FinancialMetrics> => {
  try {
    // Get host payments with booking and space details
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        bookings!inner (
          *,
          spaces!inner (
            host_id,
            title
          )
        )
      `)
      .eq('bookings.spaces.host_id', hostId)
      .eq('payment_status', 'completed')
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    if (paymentsError) throw paymentsError;

    // Calculate total revenue
    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.host_amount || 0), 0) || 0;

    // Calculate monthly data
    const monthlyMap = new Map<string, { revenue: number; bookings: number }>();
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    
    // Initialize all months
    monthNames.forEach((month, index) => {
      monthlyMap.set(month, { revenue: 0, bookings: 0 });
    });

    // Process payments
    payments?.forEach((payment) => {
      if (payment.created_at) {
        const month = new Date(payment.created_at).getMonth();
        const monthName = monthNames[month];
        if (monthName) {
          const current = monthlyMap.get(monthName) || { revenue: 0, bookings: 0 };
          current.revenue += payment.host_amount || 0;
          current.bookings += 1;
          monthlyMap.set(monthName, current);
        }
      }
    });

    const monthlyData: MonthlyData[] = monthNames.map(month => ({
      month,
      revenue: Math.round(monthlyMap.get(month)?.revenue || 0),
      bookings: monthlyMap.get(month)?.bookings || 0
    }));

    // Calculate current month revenue
    const currentMonth = new Date().getMonth();
    const monthlyRevenue = monthlyData[currentMonth]?.revenue || 0;

    // Calculate revenue growth (current month vs previous month)
    const previousMonthRevenue = currentMonth > 0 ? monthlyData[currentMonth - 1]?.revenue || 0 : 0;
    const revenueGrowth = previousMonthRevenue > 0 
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

    // Calculate average booking value
    const totalBookings = payments?.length || 0;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Calculate revenue by space category
    const categoryMap = new Map<string, number>();
    payments?.forEach((payment) => {
      // Using title as category since space_type doesn't exist in schema
      const spaceTitle = payment.bookings?.spaces?.title || 'Altro';
      const spaceType = spaceTitle.toLowerCase().includes('ufficio') ? 'private_office' :
                       spaceTitle.toLowerCase().includes('sala') ? 'meeting_room' :
                       spaceTitle.toLowerCase().includes('desk') ? 'desk' : 'other';
      const current = categoryMap.get(spaceType) || 0;
      categoryMap.set(spaceType, current + (payment.host_amount || 0));
    });

    const categoryColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const revenueByCategory: RevenueByCategory[] = Array.from(categoryMap.entries())
      .map(([name, revenue], index) => ({
        name: formatSpaceTypeName(name),
        value: Math.round((revenue / totalRevenue) * 100),
        color: categoryColors[index % categoryColors.length] || '#6B7280'
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Calculate occupancy rate (simplified - would need more complex logic with space availability)
    const totalBookingsCount = totalBookings;
    const estimatedCapacity = totalBookingsCount * 1.5; // Rough estimate
    const occupancyRate = estimatedCapacity > 0 ? (totalBookingsCount / estimatedCapacity) * 100 : 0;

    return {
      totalRevenue: Math.round(totalRevenue),
      monthlyRevenue: Math.round(monthlyRevenue),
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      averageBookingValue: Math.round(averageBookingValue),
      occupancyRate: Math.min(Math.round(occupancyRate), 100),
      monthlyData,
      revenueByCategory
    };

  } catch (error) {
    console.error('Error fetching financial metrics:', error);
    
    // Return fallback data
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      averageBookingValue: 0,
      occupancyRate: 0,
      monthlyData: [],
      revenueByCategory: []
    };
  }
};

const formatSpaceTypeName = (spaceType: string): string => {
  const typeMap: Record<string, string> = {
    'private_office': 'Uffici Privati',
    'meeting_room': 'Sale Riunioni',
    'desk': 'Postazioni Desk',
    'coworking': 'Coworking',
    'event_space': 'Spazi Eventi',
    'workshop': 'Workshop',
    'other': 'Altro'
  };
  
  return typeMap[spaceType] || spaceType;
};