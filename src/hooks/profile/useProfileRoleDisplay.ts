import { useRoleAccess } from '@/hooks/useRoleAccess';

/**
 * Hook to get role display information for profile components
 * Replaces removed profile.role with secure role checking
 */
export const useProfileRoleDisplay = () => {
  const { isAdmin, isHost, primaryRole } = useRoleAccess();

  const getRoleLabel = (): string => {
    if (isAdmin) return 'Admin';
    if (isHost) return 'Host';
    return 'Coworker';
  };

  const getRoleBadgeVariant = (): 'destructive' | 'secondary' => {
    return isAdmin ? 'destructive' : 'secondary';
  };

  return {
    isAdmin,
    isHost,
    roleLabel: getRoleLabel(),
    roleBadgeVariant: getRoleBadgeVariant(),
    primaryRole
  };
};
