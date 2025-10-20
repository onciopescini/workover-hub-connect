import { useAuth } from '@/hooks/auth/useAuth';
import { getPrimaryRole, hasRole, hasAnyRole, isAdmin, isHost, isModerator, canModerate } from '@/lib/auth/role-utils';
import type { UserRole } from '@/types/auth';

/**
 * Centralized hook for role-based access control
 */
export const useRoleAccess = () => {
  const { authState } = useAuth();
  const roles = authState.roles;

  return {
    roles,
    primaryRole: getPrimaryRole(roles),
    hasRole: (role: UserRole) => hasRole(roles, role),
    hasAnyRole: (allowedRoles: UserRole[]) => hasAnyRole(roles, allowedRoles),
    isAdmin: isAdmin(roles),
    isHost: isHost(roles),
    isModerator: isModerator(roles),
    canModerate: canModerate(roles),
  };
};
