import { useAuth } from "@/hooks/auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if current user has moderator or admin privileges
 * Fetches roles from user_roles table for accurate permission checking
 */
export const useModeratorCheck = () => {
  const { authState } = useAuth();
  const userId = authState.user?.id;

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data.map(r => r.role);
    },
    enabled: !!userId,
  });

  const isAdmin = userRoles?.includes('admin') || false;
  const isModerator = userRoles?.includes('moderator') || false;
  const canModerate = isAdmin || isModerator;

  return {
    isAdmin,
    isModerator,
    canModerate,
    isLoading,
    roles: userRoles || [],
  };
};
