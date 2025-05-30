import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminProfile, AdminSpace, AdminStats, AdminWarning, GlobalTag, AdminActionLog } from "@/types/admin";

// Check if current user is admin
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.user.id)
      .single();

    return profile?.role === "admin" && !profile?.is_suspended;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

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
    console.error("Error fetching admin stats:", error);
    throw error;
  }
};

// User management functions
export const getAllUsers = async (): Promise<AdminProfile[]> => {
  try {
    console.log("getAllUsers: Starting fetch...");
    
    // Verify admin status first
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) {
      console.log("getAllUsers: No authenticated user");
      return [];
    }

    console.log("getAllUsers: Current user ID:", currentUser.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', currentUser.user.id)
      .single();

    console.log("getAllUsers: Current user profile:", profile);

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      console.log("getAllUsers: User is not admin or is suspended");
      return [];
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getAllUsers: Database error:", error);
      throw error;
    }
    
    console.log("getAllUsers: Fetched profiles:", data?.length || 0, "profiles");
    console.log("getAllUsers: Sample profiles:", data?.slice(0, 3));
    
    return data as AdminProfile[];
  } catch (error) {
    console.error("getAllUsers: Error fetching users:", error);
    throw error;
  }
};

export const suspendUser = async (userId: string, reason: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("suspend_user", {
      target_user_id: userId,
      reason: reason,
      suspended_by_admin: currentUser.user.id
    });

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to suspend user");
    }

    toast.success("Utente sospeso con successo");
  } catch (error) {
    console.error("Error suspending user:", error);
    toast.error("Errore nella sospensione dell'utente");
    throw error;
  }
};

export const reactivateUser = async (userId: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("reactivate_user", {
      target_user_id: userId,
      reactivated_by_admin: currentUser.user.id
    });

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to reactivate user");
    }

    toast.success("Utente riattivato con successo");
  } catch (error) {
    console.error("Error reactivating user:", error);
    toast.error("Errore nella riattivazione dell'utente");
    throw error;
  }
};

// Space management functions
export const getAllSpaces = async (): Promise<AdminSpace[]> => {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as AdminSpace[];
  } catch (error) {
    console.error("Error fetching spaces:", error);
    throw error;
  }
};

export const moderateSpace = async (spaceId: string, approve: boolean, rejectionReason?: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("moderate_space", {
      space_id: spaceId,
      approve: approve,
      moderator_id: currentUser.user.id,
      rejection_reason: rejectionReason || null
    });

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to moderate space");
    }

    toast.success(approve ? "Spazio approvato" : "Spazio rifiutato");
  } catch (error) {
    console.error("Error moderating space:", error);
    toast.error("Errore nella moderazione dello spazio");
    throw error;
  }
};

// Warning management functions
export const createWarning = async (warning: Omit<AdminWarning, "id" | "created_at" | "updated_at">): Promise<void> => {
  try {
    const { error } = await supabase
      .from("admin_warnings")
      .insert(warning);

    if (error) throw error;
    toast.success("Warning inviato con successo");
  } catch (error) {
    console.error("Error creating warning:", error);
    toast.error("Errore nell'invio del warning");
    throw error;
  }
};

export const getUserWarnings = async (userId: string): Promise<AdminWarning[]> => {
  try {
    const { data, error } = await supabase
      .from("admin_warnings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as AdminWarning[];
  } catch (error) {
    console.error("Error fetching user warnings:", error);
    throw error;
  }
};

// Tag management functions
export const getAllTags = async (): Promise<GlobalTag[]> => {
  try {
    const { data, error } = await supabase
      .from("global_tags")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as GlobalTag[];
  } catch (error) {
    console.error("Error fetching tags:", error);
    throw error;
  }
};

export const approveTag = async (tagId: string): Promise<void> => {
  try {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) throw new Error("Not authenticated");

    const { data, error } = await supabase.rpc("approve_tag", {
      tag_id: tagId,
      approver_id: currentUser.user.id
    });

    if (error) throw error;
    
    const result = data as { success: boolean; error?: string; message?: string };
    if (!result.success) {
      throw new Error(result.error || "Failed to approve tag");
    }

    toast.success("Tag approvato con successo");
  } catch (error) {
    console.error("Error approving tag:", error);
    toast.error("Errore nell'approvazione del tag");
    throw error;
  }
};

// Admin actions log
export const getAdminActionsLog = async (): Promise<AdminActionLog[]> => {
  try {
    console.log("getAdminActionsLog: Starting fetch...");
    
    // Verify admin status first
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser?.user) {
      console.log("getAdminActionsLog: No authenticated user");
      return [];
    }

    console.log("getAdminActionsLog: Current user ID:", currentUser.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', currentUser.user.id)
      .single();

    console.log("getAdminActionsLog: Current user profile:", profile);

    if (!profile || profile.role !== 'admin' || profile.is_suspended) {
      console.log("getAdminActionsLog: User is not admin or is suspended");
      return [];
    }
    
    const { data, error } = await supabase
      .from("admin_actions_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("getAdminActionsLog: Database error:", error);
      throw error;
    }
    
    console.log("getAdminActionsLog: Fetched logs:", data?.length || 0, "entries");
    console.log("getAdminActionsLog: Sample logs:", data?.slice(0, 3));
    
    return data as AdminActionLog[];
  } catch (error) {
    console.error("getAdminActionsLog: Error fetching admin actions log:", error);
    throw error;
  }
};
