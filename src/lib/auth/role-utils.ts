import { UserRole } from '@/types/auth';

/**
 * Determine the primary role to display in the UI
 * Priority: admin > host > moderator > coworker > user
 */
export const getPrimaryRole = (roles: UserRole[]): UserRole => {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('host')) return 'host';
  if (roles.includes('moderator')) return 'moderator';
  if (roles.includes('coworker')) return 'coworker';
  return 'user';
};

/**
 * Check if user has a specific role
 */
export const hasRole = (roles: UserRole[], role: UserRole): boolean => {
  return roles.includes(role);
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (roles: UserRole[], allowedRoles: UserRole[]): boolean => {
  return allowedRoles.some(role => roles.includes(role));
};

/**
 * Check if user is admin
 */
export const isAdmin = (roles: UserRole[]): boolean => {
  return roles.includes('admin');
};

/**
 * Check if user is host
 */
export const isHost = (roles: UserRole[]): boolean => {
  return roles.includes('host');
};

/**
 * Check if user is moderator
 */
export const isModerator = (roles: UserRole[]): boolean => {
  return roles.includes('moderator');
};

/**
 * Check if user can moderate (admin or moderator)
 */
export const canModerate = (roles: UserRole[]): boolean => {
  return roles.includes('admin') || roles.includes('moderator');
};
