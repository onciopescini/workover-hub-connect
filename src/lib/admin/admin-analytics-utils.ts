import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";
import type {
  AnalyticsProfile,
  AnalyticsBooking,
  AnalyticsPayment,
  AnalyticsReview,
  KPIResult,
  UserGrowthDataPoint,
  BookingTrendsResult,
  BookingTrendDataPoint,
  CityDistribution,
  CategoryDistribution,
  RevenueTrendsResult,
  RevenueTrendDataPoint,
  RevenueBreakdown,
  HostPerformanceStats,
  AnalyticsExportData,
} from "./admin-analytics-types";

// KPI Calculations
export function calculateKPIs(
  users: AnalyticsProfile[],
  bookings: AnalyticsBooking[],
  payments: AnalyticsPayment[],
  days: number
): KPIResult {
  const now = new Date();
  const prevPeriodStart = subDays(now, days * 2);
  const currentPeriodStart = subDays(now, days);

  // Current period metrics
  const currentUsers = users.filter(u => {
    const lastLogin = u.last_login_at ? new Date(u.last_login_at) : null;
    return lastLogin && lastLogin >= currentPeriodStart;
  });
  const currentBookings = bookings.filter(b => {
    if (!b.created_at) return false;
    return new Date(b.created_at) >= currentPeriodStart;
  });
  const currentPayments = payments.filter(p => {
    if (!p.created_at) return false;
    return new Date(p.created_at) >= currentPeriodStart;
  });
  const currentRevenue = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Previous period metrics
  const prevUsers = users.filter(u => {
    const lastLogin = u.last_login_at ? new Date(u.last_login_at) : null;
    return lastLogin && lastLogin >= prevPeriodStart && lastLogin < currentPeriodStart;
  });
  const prevBookings = bookings.filter(b => {
    if (!b.created_at) return false;
    const createdAt = new Date(b.created_at);
    return createdAt >= prevPeriodStart && createdAt < currentPeriodStart;
  });
  const prevPayments = payments.filter(p => {
    if (!p.created_at) return false;
    const createdAt = new Date(p.created_at);
    return createdAt >= prevPeriodStart && createdAt < currentPeriodStart;
  });
  const prevRevenue = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Calculate changes
  const activeUsersChange = prevUsers.length > 0 
    ? ((currentUsers.length - prevUsers.length) / prevUsers.length) * 100 
    : 0;
  
  const bookingsChange = prevBookings.length > 0 
    ? ((currentBookings.length - prevBookings.length) / prevBookings.length) * 100 
    : 0;
  
  const revenueChange = prevRevenue > 0 
    ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
    : 0;

  // Conversion rate (bookings / active users)
  const currentConversionRate = currentUsers.length > 0 
    ? (currentBookings.length / currentUsers.length) * 100 
    : 0;
  
  const prevConversionRate = prevUsers.length > 0 
    ? (prevBookings.length / prevUsers.length) * 100 
    : 0;
  
  const conversionChange = prevConversionRate > 0 
    ? ((currentConversionRate - prevConversionRate) / prevConversionRate) * 100 
    : 0;

  return {
    activeUsers: currentUsers.length,
    activeUsersChange,
    totalBookings: currentBookings.length,
    bookingsChange,
    totalRevenue: currentRevenue,
    revenueChange,
    conversionRate: currentConversionRate,
    conversionChange,
  };
}

// User Growth Calculations
export function calculateUserGrowth(
  profiles: AnalyticsProfile[],
  days: number
): UserGrowthDataPoint[] {
  const data: UserGrowthDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);
    const dateStr = format(date, "dd MMM", { locale: it });

    const signups = profiles.filter(p => {
      if (!p.created_at) return false;
      const createdDate = new Date(p.created_at);
      return createdDate.toDateString() === date.toDateString();
    }).length;

    const activeUsers = profiles.filter(p => {
      if (!p.last_login_at) return false;
      const lastLogin = new Date(p.last_login_at);
      return lastLogin.toDateString() === date.toDateString();
    }).length;

    const hosts = profiles.filter(p => {
      if (!p.created_at) return false;
      return p.role === 'host' && new Date(p.created_at) <= date;
    }).length;

    const coworkers = profiles.filter(p => {
      if (!p.created_at) return false;
      return p.role === 'coworker' && new Date(p.created_at) <= date;
    }).length;

    data.push({
      date: dateStr,
      signups,
      activeUsers,
      hosts,
      coworkers,
      retentionRate: signups > 0 ? ((activeUsers / signups) * 100).toFixed(1) : 0,
    });
  }

  return data;
}

// Booking Trends Calculations
export function calculateBookingTrends(
  bookings: AnalyticsBooking[],
  days: number
): BookingTrendsResult {
  const trends: BookingTrendDataPoint[] = [];
  const byCity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);
    const dateStr = format(date, "dd MMM", { locale: it });

    const dayBookings = bookings.filter(b => {
      if (!b.created_at) return false;
      const createdDate = new Date(b.created_at);
      return createdDate.toDateString() === date.toDateString();
    });

    const confirmed = dayBookings.filter(b => b.status === 'confirmed').length;
    const cancelled = dayBookings.filter(b => b.status === 'cancelled').length;

    trends.push({
      date: dateStr,
      confirmed,
      cancelled,
      avgLeadTime: 3, // Mock data - would come from DB
      occupancyRate: 65, // Mock data - would come from DB
    });
  }

  // Calculate by city and category
  bookings.forEach(b => {
    if (b.space?.city) {
      byCity[b.space.city] = (byCity[b.space.city] || 0) + 1;
    }
    if (b.space?.category) {
      byCategory[b.space.category] = (byCategory[b.space.category] || 0) + 1;
    }
  });

  const cityDistribution: CityDistribution[] = Object.entries(byCity)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const categoryDistribution: CategoryDistribution[] = Object.entries(byCategory)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    trends,
    byCity: cityDistribution,
    byCategory: categoryDistribution,
  };
}

// Revenue Trends Calculations
export function calculateRevenueTrends(
  payments: AnalyticsPayment[],
  totalUsers: number,
  totalHosts: number,
  days: number
): RevenueTrendsResult {
  const trends: RevenueTrendDataPoint[] = [];
  const now = new Date();
  const paymentMethods: Record<string, number> = {};

  let totalRevenue = 0;
  let totalPlatformFees = 0;
  let totalHostPayouts = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);
    const dateStr = format(date, "dd MMM", { locale: it });

    const dayPayments = payments.filter(p => {
      if (!p.created_at) return false;
      const createdDate = new Date(p.created_at);
      return createdDate.toDateString() === date.toDateString();
    });

    const dayRevenue = dayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const dayFees = dayPayments.reduce((sum, p) => sum + Number(p.platform_fee || 0), 0);
    const dayPayouts = dayPayments.reduce((sum, p) => sum + Number(p.host_amount || 0), 0);

    totalRevenue += dayRevenue;
    totalPlatformFees += dayFees;
    totalHostPayouts += dayPayouts;

    trends.push({
      date: dateStr,
      totalRevenue: dayRevenue,
      platformFees: dayFees,
      hostPayouts: dayPayouts,
    });
  }

  // Calculate payment methods
  payments.forEach(p => {
    const method = p.method || 'card';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });

  const breakdown: RevenueBreakdown = {
    totalRevenue,
    platformFees: totalPlatformFees,
    hostPayouts: totalHostPayouts,
    avgBookingValue: payments.length > 0 ? totalRevenue / payments.length : 0,
    revenuePerUser: totalUsers > 0 ? totalRevenue / totalUsers : 0,
    revenuePerHost: totalHosts > 0 ? totalRevenue / totalHosts : 0,
    paymentMethods: Object.entries(paymentMethods).map(([method, count]) => ({
      method,
      count,
    })),
  };

  return {
    trends,
    breakdown,
  };
}

// Host Performance Calculations
export function calculateHostPerformance(
  bookings: AnalyticsBooking[],
  payments: AnalyticsPayment[],
  reviews: AnalyticsReview[],
  hosts: AnalyticsProfile[]
): HostPerformanceStats[] {
  const hostStats: Record<string, HostPerformanceStats> = {};

  // Initialize host stats
  hosts.forEach(host => {
    const firstName = host.first_name || '';
    const lastName = host.last_name || '';
    hostStats[host.id] = {
      hostId: host.id,
      hostName: `${firstName} ${lastName}`.trim() || 'Host',
      totalRevenue: 0,
      totalBookings: 0,
      spacesCount: 0,
      avgResponseTime: Math.floor(Math.random() * 120) + 30, // Mock data
      acceptanceRate: Math.floor(Math.random() * 30) + 70, // Mock data
      avgRating: 0,
      ratingCount: 0,
    };
  });

  // Calculate bookings per host
  bookings.forEach(b => {
    const hostId = b.space?.host_id;
    if (hostId && hostStats[hostId]) {
      hostStats[hostId].totalBookings++;
    }
  });

  // Calculate revenue per host
  payments.forEach(p => {
    const hostId = p.booking?.space?.host_id;
    if (hostId && hostStats[hostId]) {
      hostStats[hostId].totalRevenue += Number(p.host_amount || 0);
    }
  });

  // Calculate ratings per host
  reviews.forEach(r => {
    const hostId = r.booking?.space?.host_id;
    if (hostId && hostStats[hostId]) {
      hostStats[hostId].avgRating += r.rating;
      hostStats[hostId].ratingCount++;
    }
  });

  // Finalize averages
  Object.values(hostStats).forEach(stat => {
    if (stat.ratingCount > 0) {
      stat.avgRating = stat.avgRating / stat.ratingCount;
    } else {
      stat.avgRating = 0;
    }
    // Count unique spaces (mock for now - would come from DB)
    stat.spacesCount = Math.floor(Math.random() * 5) + 1;
  });

  return Object.values(hostStats)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
}

// Export functions
export function exportAnalyticsToCSV(data: AnalyticsExportData): void {
  const csvRows: string[] = [];
  
  // Add KPIs section
  if (data.kpis) {
    csvRows.push("KPIs");
    csvRows.push("Metric,Value,Change");
    csvRows.push(`Active Users,${data.kpis.activeUsers},${data.kpis.activeUsersChange.toFixed(1)}%`);
    csvRows.push(`Total Bookings,${data.kpis.totalBookings},${data.kpis.bookingsChange.toFixed(1)}%`);
    csvRows.push(`Total Revenue,€${data.kpis.totalRevenue.toFixed(2)},${data.kpis.revenueChange.toFixed(1)}%`);
    csvRows.push(`Conversion Rate,${data.kpis.conversionRate.toFixed(1)}%,${data.kpis.conversionChange.toFixed(1)}%`);
    csvRows.push("");
  }

  const csv = csvRows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `analytics-report-${data.timeRange}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAnalyticsToPDF(data: AnalyticsExportData): void {
  // Simplified PDF export - in production, use a library like jsPDF
  console.warn("PDF export would be implemented with jsPDF library", data);
  alert("PDF export feature - would use jsPDF library in production");
}
