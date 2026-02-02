// Typed interfaces for admin analytics calculations - fixes P1 type safety
// Note: These types match the actual database schema (nullable fields are allowed)

/**
 * User profile data needed for analytics calculations
 * Note: Fields are optional to accommodate different query contexts
 */
export interface AnalyticsProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: 'host' | 'coworker' | 'user' | string | null;
  created_at?: string | null;
  last_login_at?: string | null;
}

/**
 * Booking data needed for analytics calculations
 */
export interface AnalyticsBooking {
  id: string;
  created_at: string | null;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | string | null;
  booking_date?: string | null;
  space?: {
    id?: string;
    host_id?: string | null;
    city?: string | null;
    category?: string | null;
    title?: string | null;
  } | null;
}

/**
 * Payment data needed for analytics calculations
 * Note: Fields are optional to accommodate different query contexts
 */
export interface AnalyticsPayment {
  id?: string;
  amount?: number;
  created_at?: string | null;
  platform_fee?: number | null;
  host_amount?: number | null;
  method?: string | null;
  booking_id?: string | null;
  user_id?: string | null;
  booking?: {
    space?: {
      host_id?: string | null;
    } | null;
  } | null;
}

/**
 * Review data for host performance calculations
 */
export interface AnalyticsReview {
  id?: string;
  rating: number;
  booking?: {
    space?: {
      host_id?: string | null;
    } | null;
  } | null;
}

/**
 * KPI calculation result
 */
export interface KPIResult {
  activeUsers: number;
  activeUsersChange: number;
  totalBookings: number;
  bookingsChange: number;
  totalRevenue: number;
  revenueChange: number;
  conversionRate: number;
  conversionChange: number;
}

/**
 * User growth data point
 */
export interface UserGrowthDataPoint {
  date: string;
  signups: number;
  activeUsers: number;
  hosts: number;
  coworkers: number;
  retentionRate: number | string;
}

/**
 * Booking trend data point
 */
export interface BookingTrendDataPoint {
  date: string;
  confirmed: number;
  cancelled: number;
  avgLeadTime: number;
  occupancyRate: number;
}

/**
 * City distribution item
 */
export interface CityDistribution {
  name: string;
  value: number;
}

/**
 * Category distribution item
 */
export interface CategoryDistribution {
  category: string;
  count: number;
}

/**
 * Booking trends result
 */
export interface BookingTrendsResult {
  trends: BookingTrendDataPoint[];
  byCity: CityDistribution[];
  byCategory: CategoryDistribution[];
}

/**
 * Revenue trend data point
 */
export interface RevenueTrendDataPoint {
  date: string;
  totalRevenue: number;
  platformFees: number;
  hostPayouts: number;
}

/**
 * Payment method distribution
 */
export interface PaymentMethodDistribution {
  method: string;
  count: number;
}

/**
 * Revenue breakdown
 */
export interface RevenueBreakdown {
  totalRevenue: number;
  platformFees: number;
  hostPayouts: number;
  avgBookingValue: number;
  revenuePerUser: number;
  revenuePerHost: number;
  paymentMethods: PaymentMethodDistribution[];
}

/**
 * Revenue trends result
 */
export interface RevenueTrendsResult {
  trends: RevenueTrendDataPoint[];
  breakdown: RevenueBreakdown;
}

/**
 * Host performance statistics
 */
export interface HostPerformanceStats {
  hostId: string;
  hostName: string;
  totalRevenue: number;
  totalBookings: number;
  spacesCount: number;
  avgResponseTime: number;
  acceptanceRate: number;
  avgRating: number;
  ratingCount: number;
}

/**
 * Analytics export data structure
 */
export interface AnalyticsExportData {
  timeRange: string;
  kpis?: KPIResult;
  userGrowth?: UserGrowthDataPoint[];
  bookingTrends?: BookingTrendsResult;
  revenueTrends?: RevenueTrendsResult;
  hostPerformance?: HostPerformanceStats[];
}
