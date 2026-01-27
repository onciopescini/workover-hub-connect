import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

export const getHostFinancialMetrics = async (hostId: string, year: number = new Date().getFullYear()): Promise<FinancialMetrics> => {
  try {
    // Usa la funzione database sicura per le metriche di base
    const { data: hostMetrics, error: metricsError } = await supabase.rpc('get_host_metrics', {
      host_id_param: hostId
    });

    if (metricsError) {
      sreLogger.error('Error fetching host metrics', { 
        context: 'getHostFinancialMetrics',
        hostId 
      }, metricsError as Error);
      throw metricsError;
    }

    const metrics = isRecord(hostMetrics) ? hostMetrics : {};
    
    // Crea dati mensili semplificati (solo mese corrente con dati reali)
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    
    const monthlyData: MonthlyData[] = monthNames.map((month, index) => ({
      month,
      revenue: index === currentMonth ? Math.round(getNumber(metrics['monthlyRevenue']) || 0) : 0,
      bookings: index === currentMonth ? Math.max(1, Math.floor(getNumber(metrics['confirmedBookings']) || 0)) : 0
    }));

    // Categoria di revenue semplificata (non espone dettagli sensibili)
    const revenueByCategory: RevenueByCategory[] = metrics['topPerformingSpace'] ? [
      {
        name: 'Spazi Coworking',
        value: 100, // Percentuale (100% dato che è l'unica categoria mostrata)
        color: '#3B82F6'
      }
    ] : [];

    return {
      totalRevenue: Math.round(getNumber(metrics['totalRevenue']) || 0),
      monthlyRevenue: Math.round(getNumber(metrics['monthlyRevenue']) || 0),
      revenueGrowth: Math.round((getNumber(metrics['revenueGrowth']) || 0) * 100) / 100,
      averageBookingValue: Math.round(getNumber(metrics['averageBookingValue']) || 0),
      occupancyRate: Math.min(Math.round(getNumber(metrics['occupancyRate']) || 0), 100),
      monthlyData,
      revenueByCategory
    };

  } catch (error) {
    sreLogger.error('Error fetching financial metrics', { 
      context: 'getHostFinancialMetrics',
      hostId,
      year 
    }, error as Error);
    
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
