import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// Extend the database profile type to include the new column until types are regenerated
export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  portfolio_url?: string | null;
};

export type UserRole = "host" | "user" | "admin" | "moderator" | "coworker";

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  error?: Error | null;
}
