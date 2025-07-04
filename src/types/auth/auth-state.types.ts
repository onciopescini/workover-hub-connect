import type { User, Session } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

// Use the actual database schema for Profile type
export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  // Add missing fields that may not be in the generated types yet
  phone?: string | null;
  city?: string | null;
  profession?: string | null;
  competencies?: string[] | null;
  industries?: string[] | null;
};

export type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export type UserRole = "host" | "coworker" | "admin";