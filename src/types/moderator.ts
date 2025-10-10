import { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type UserRoleInsert = Database["public"]["Tables"]["user_roles"]["Insert"];

export type AppRole = 'admin' | 'moderator' | 'user';

export interface ModeratorPermissions {
  canModerateSpaces: boolean;
  canModerateReports: boolean;
  canModerateTags: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAnalytics: boolean;
}
