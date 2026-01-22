
import { supabase } from "@/integrations/supabase/client";
import { AdminStats } from "@/types/admin";
import { sreLogger } from '@/lib/sre-logger';

// Get admin dashboard stats
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    // Get user counts - Fix B.1: Use 'id' instead of '*' for count queries
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const { count: totalHosts } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "host");

    const { count: suspendedUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_suspended", true);

    // Get space counts
    const { count: totalSpaces } = await supabase
      .from("spaces")
      .select("id", { count: "exact", head: true });

    // Get pending spaces count
    const { count: pendingSpaces } = await supabase
      .from("spaces")
      .select("id", { count: "exact", head: true })
      .eq("pending_approval", true);

    // Get booking counts
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true });

    const { count: activeBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed");

    // Get reports count (open)
    const { count: openReports } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");

    // Get unresolved tickets (open + in_progress)
    const { count: unresolvedTickets } = await supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]);

    // Get pending GDPR requests
    const { count: pendingGdprRequests } = await supabase
      .from("gdpr_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // Get active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_login_at", thirtyDaysAgo.toISOString());

    // Calculate total revenue (simplified)
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("payment_status", "completed");

    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    sreLogger.info('Successfully fetched admin stats', {
      totalUsers,
      pendingSpaces,
      openReports,
      unresolvedTickets,
      pendingGdprRequests
    });

    return {
      totalUsers: totalUsers || 0,
      totalHosts: totalHosts || 0,
      totalSpaces: totalSpaces || 0,
      pendingSpaces: pendingSpaces || 0,
      suspendedUsers: suspendedUsers || 0,
      totalBookings: totalBookings || 0,
      activeBookings: activeBookings || 0,
      totalRevenue,
      openReports: openReports || 0,
      unresolvedTickets: unresolvedTickets || 0,
      pendingGdprRequests: pendingGdprRequests || 0,
      activeUsers: activeUsers || 0,
      userGrowthTrend: 0
    };
  } catch (error) {
    sreLogger.error('Error fetching admin stats', {}, error as Error);
    throw error;
  }
};
