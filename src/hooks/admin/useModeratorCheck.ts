import { useAuth } from "@/hooks/auth/useAuth";

export const useModeratorCheck = () => {
  const { authState } = useAuth();

  const roles = authState.roles || [];
  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');

  return {
    isAdmin,
    isModerator,
    canModerate: isAdmin || isModerator,
    isLoading: authState.isLoading,
    roles
  };
};
