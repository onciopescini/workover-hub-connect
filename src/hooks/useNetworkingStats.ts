import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';

interface NetworkingStats {
  messagesThisWeek: number;
  profileViews: number;
  connectionRate: number;
}

export const useNetworkingStats = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: ['networking-stats', authState.user?.id],
    queryFn: async (): Promise<NetworkingStats> => {
      if (!authState.user?.id) {
        return { messagesThisWeek: 0, profileViews: 0, connectionRate: 0 };
      }

      // Use raw SQL via rpc for functions not in types yet
      const { data, error } = await supabase
        .rpc('get_networking_stats' as never, {
          p_user_id: authState.user.id
        } as never);

      if (error) {
        console.error('Error fetching networking stats:', error);
        return { messagesThisWeek: 0, profileViews: 0, connectionRate: 0 };
      }

      // Handle the jsonb return type
      const stats = data as Record<string, number> | null;

      return {
        messagesThisWeek: stats?.['messagesThisWeek'] ?? 0,
        profileViews: stats?.['profileViews'] ?? 0,
        connectionRate: stats?.['connectionRate'] ?? 0
      };
    },
    enabled: !!authState.user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
