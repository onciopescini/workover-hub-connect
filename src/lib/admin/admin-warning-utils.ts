
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminWarning } from "@/types/admin";

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
