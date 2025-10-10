import { AppRole } from "@/types/moderator";

/**
 * Permission checks for moderator and admin roles
 * These functions determine what actions each role can perform
 * 
 * NOTE: These functions work with roles from the user_roles table,
 * not from the profiles.role field. Use useModeratorCheck hook to get roles.
 */

export const canModerateSpaces = (roles: AppRole[]): boolean => {
  return roles.includes('admin') || roles.includes('moderator');
};

export const canModerateReports = (roles: AppRole[]): boolean => {
  return roles.includes('admin') || roles.includes('moderator');
};

export const canModerateTags = (roles: AppRole[]): boolean => {
  return roles.includes('admin') || roles.includes('moderator');
};

export const canManageUsers = (roles: AppRole[]): boolean => {
  return roles.includes('admin'); // Only admins can manage users
};

export const canManageSystemRoles = (roles: AppRole[]): boolean => {
  return roles.includes('admin'); // Only admins can assign/remove roles
};

export const canManageSettings = (roles: AppRole[]): boolean => {
  return roles.includes('admin'); // Only admins can manage system settings
};

export const canViewAnalytics = (roles: AppRole[]): boolean => {
  return roles.includes('admin') || roles.includes('moderator');
};

export const canAccessAdminPanel = (roles: AppRole[]): boolean => {
  return roles.includes('admin') || roles.includes('moderator');
};

/**
 * Get user's role display name
 */
export const getRoleDisplayName = (role: string | undefined): string => {
  switch (role) {
    case 'admin':
      return 'Amministratore';
    case 'moderator':
      return 'Moderatore';
    case 'host':
      return 'Host';
    case 'coworker':
      return 'Coworker';
    default:
      return 'Utente';
  }
};

/**
 * Get badge variant for role
 */
export const getRoleBadgeVariant = (role: string | undefined): 'default' | 'secondary' | 'destructive' => {
  switch (role) {
    case 'admin':
      return 'destructive'; // Red for admin
    case 'moderator':
      return 'default'; // Yellow/primary for moderator
    case 'host':
      return 'secondary';
    default:
      return 'secondary';
  }
};
