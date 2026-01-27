
export interface AdminUser {
  id: string;
  email: string; // Added email
  first_name: string;
  last_name: string;
  role: string; // Business role: host | coworker
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  phone: string | null;
  city: string | null;
  profession: string | null;
  competencies: string[] | null;
  industries: string[] | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  banned_at: string | null;
  ban_reason: string | null;
}

// System roles (admin, moderator) stored in user_roles table
export type SystemRole = 'admin' | 'moderator';

export interface UserRole {
  id: string;
  user_id: string;
  role: SystemRole;
  assigned_at: string | null;
  assigned_by: string | null;
}

// Extended AdminUser with system roles
export interface AdminUserWithRoles extends AdminUser {
  system_roles: UserRole[];
}
