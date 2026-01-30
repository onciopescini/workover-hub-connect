import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

export interface AdminDashboardStats {
  // Financial Metrics
  pendingEscrow: number;
  pendingEscrowCount: number;
  
  // Booking Health
  pendingApproval: number;
  disputed: number;
  cancelledToday: number;
  
  // User Counts
  totalUsers: number;
  totalHosts: number;
  
  // Platform Metrics
  grossVolume: number;
  estimatedRevenue: number;
}

export interface UserGrowthData {
  date: string;
  hosts: number;
  coworkers: number;
}

/**
 * Centralized hook for Admin Dashboard metrics.
 * Aggregates all dashboard queries to avoid N+1 issues.
 */
export function useAdminDashboardStats() {
  return useQuery<AdminDashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // Execute all queries in parallel
        const [
          pendingEscrowResult,
          pendingApprovalResult,
          disputedResult,
          cancelledTodayResult,
          totalUsersResult,
          totalHostsResult,
          revenueResult
        ] = await Promise.all([
          // Pending Escrow: Bookings where payout not yet completed
          supabase
            .from('bookings')
            .select('total_price')
            .is('payout_completed_at', null)
            .in('status', ['served', 'confirmed', 'checked_in'])
            .is('deleted_at', null),
          
          // Pending Approval count
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending_approval')
            .is('deleted_at', null),
          
          // Disputed bookings
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'disputed')
            .is('deleted_at', null),
          
          // Cancelled today
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'cancelled')
            .gte('cancelled_at', today)
            .is('deleted_at', null),
          
          // Total users
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true }),
          
          // Total hosts
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'host'),
          
          // Revenue data from view
          supabase
            .from('admin_platform_revenue' as 'profiles')
            .select('*')
        ]);

        // Calculate pending escrow
        const pendingEscrowData = pendingEscrowResult.data || [];
        const pendingEscrow = pendingEscrowData.reduce(
          (sum, b) => sum + (b.total_price || 0), 
          0
        );

        // Calculate revenue metrics from view
        const revenueData = (revenueResult.data || []) as unknown as Array<{
          gross_volume: number;
          estimated_revenue: number;
        }>;
        const grossVolume = revenueData.reduce((sum, r) => sum + (r.gross_volume || 0), 0);
        const estimatedRevenue = revenueData.reduce((sum, r) => sum + (r.estimated_revenue || 0), 0);

        sreLogger.info('Admin dashboard stats fetched', {
          pendingEscrow,
          pendingApproval: pendingApprovalResult.count,
          disputed: disputedResult.count
        });

        return {
          pendingEscrow,
          pendingEscrowCount: pendingEscrowData.length,
          pendingApproval: pendingApprovalResult.count || 0,
          disputed: disputedResult.count || 0,
          cancelledToday: cancelledTodayResult.count || 0,
          totalUsers: totalUsersResult.count || 0,
          totalHosts: totalHostsResult.count || 0,
          grossVolume,
          estimatedRevenue,
        };
      } catch (error) {
        sreLogger.error('Error fetching admin dashboard stats', {}, error as Error);
        throw error;
      }
    },
    refetchInterval: 60000, // Auto-refresh every minute
    staleTime: 30000,
  });
}

/**
 * Hook for User Growth chart data (last 30 days)
 */
export function useUserGrowthData() {
  return useQuery<UserGrowthData[]>({
    queryKey: ['admin-user-growth'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('profiles')
        .select('role, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Group by date and role
      const dailyData = new Map<string, { hosts: number; coworkers: number }>();
      
      // Initialize all 30 days with zeros
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const isoString = date.toISOString();
        const dateKey = isoString.split('T')[0] as string;
        dailyData.set(dateKey, { hosts: 0, coworkers: 0 });
      }

      // Aggregate signups by day
      (data || []).forEach((profile) => {
        const createdAt = profile.created_at;
        if (!createdAt) return;
        const dateKey = createdAt.split('T')[0] as string;
        const current = dailyData.get(dateKey);
        if (current) {
          if (profile.role === 'host') {
            current.hosts++;
          } else {
            current.coworkers++;
          }
        }
      });

      // Convert to array for chart
      return Array.from(dailyData.entries()).map(([date, counts]) => ({
        date,
        hosts: counts.hosts,
        coworkers: counts.coworkers,
      }));
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook for quick alerts panel
 */
export function useAdminAlerts() {
  return useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const [kycResult, ticketsResult, gdprResult] = await Promise.all([
        // Pending KYC verifications
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'host')
          .eq('is_verified', false),
        
        // Open support tickets
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
        
        // Pending GDPR requests
        supabase
          .from('gdpr_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ]);

      return {
        pendingKyc: kycResult.count || 0,
        openTickets: ticketsResult.count || 0,
        pendingGdpr: gdprResult.count || 0,
      };
    },
    refetchInterval: 120000, // 2 minutes
  });
}
