/**
 * Database Type Extensions
 * 
 * This file extends the auto-generated Supabase types to include
 * additional fields that are computed or come from views/joins.
 */

import type { Database } from '@/integrations/supabase/types';

// Extend the Profile type to include role from user_roles table
export type ProfileWithRole = Database['public']['Tables']['profiles']['Row'] & {
  role?: 'admin' | 'host' | 'moderator' | 'user' | null;
};

// Re-export with the extended type
declare module '@/integrations/supabase/types' {
  export interface Database {
    public: {
      Tables: {
        profiles: {
          Row: ProfileWithRole;
          Insert: Database['public']['Tables']['profiles']['Insert'];
          Update: Database['public']['Tables']['profiles']['Update'];
        };
      };
    };
  }
}
