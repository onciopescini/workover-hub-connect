
import { supabase } from "@/integrations/supabase/client";
import { AdminStats } from "@/types/admin";
import { sreLogger } from '@/lib/sre-logger';

// Get admin dashboard stats
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    // Get user counts
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: totalHosts } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "host");

    const { count: suspendedUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_suspended", true);

    // Get space counts
    const { count: totalSpaces } = await supabase
      .from("spaces")
      .select("*", { count: "exact", head: true });

    const { count: pendingSpaces } = await supabase
      .from("spaces")
      .select("*", { count: "exact", head: true })
      .eq("pending_approval", true);

    // Get booking counts
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    const { count: activeBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed");

    // Calculate total revenue (simplified)
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("payment_status", "completed");

    const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    return {
      totalUsers: totalUsers || 0,
      totalHosts: totalHosts || 0,
      totalSpaces: totalSpaces || 0,
      pendingSpaces: pendingSpaces || 0,
      suspendedUsers: suspendedUsers || 0,
      totalBookings: totalBookings || 0,
      activeBookings: activeBookings || 0,
      totalRevenue
    };
  } catch (error) {
    sreLogger.error('Error fetching admin stats', {}, error as Error);
    throw error;
  }
};
