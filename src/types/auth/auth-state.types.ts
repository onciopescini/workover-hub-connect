import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

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
