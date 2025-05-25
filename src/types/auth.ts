
import type { User, Session } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  stripe_account_id?: string | null;
  location?: string | null;
  skills?: string | null;
  interests?: string | null;
};

export type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

export type UserRole = "host" | "coworker" | "admin";
