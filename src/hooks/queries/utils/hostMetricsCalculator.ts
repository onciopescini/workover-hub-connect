
import { supabase } from "@/integrations/supabase/client";
import { HostDashboardMetrics } from "../types/hostDashboardTypes";
import { sreLogger } from '@/lib/sre-logger';

export const calculateHostMetrics = async (hostId: string): Promise<HostDashboardMetrics> => {
  try {
    // Chiama la funzione database sicura che calcola le metriche
    const { data, error } = await supabase.rpc('get_host_metrics', {
      host_id_param: hostId
    });

    if (error) {
      sreLogger.error('Error fetching host metrics', { hostId }, error);
      throw error;
    }

    if (!data) {
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

    // Cast data al tipo corretto (funzione RPC restituisce Json)
    const metrics = data as any;
    
    return {
      totalRevenue: metrics.totalRevenue || 0,
      monthlyRevenue: metrics.monthlyRevenue || 0,
      totalBookings: metrics.totalBookings || 0,
      pendingBookings: metrics.pendingBookings || 0,
      confirmedBookings: metrics.confirmedBookings || 0,
      occupancyRate: metrics.occupancyRate || 0,
      averageBookingValue: metrics.averageBookingValue || 0,
      revenueGrowth: metrics.revenueGrowth || 0,
      topPerformingSpace: metrics.topPerformingSpace,
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
