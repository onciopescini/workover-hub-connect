
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/useAuth";
import { calculateHostMetrics } from "./utils/hostMetricsCalculator";
import { TIME_CONSTANTS } from "@/constants";
import { handleRLSError } from '@/lib/rls-error-handler';
import { toast } from 'sonner';

export const useHostDashboardMetrics = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: ['host-dashboard-metrics', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) throw new Error('No authenticated user');
      
      try {
        return await calculateHostMetrics(authState.user.id);
      } catch (error) {
        // Handle RLS errors with user-friendly messages
        const rlsResult = handleRLSError(error);
        if (rlsResult.isRLSError && rlsResult.shouldShowToast) {
          toast.error('Accesso negato', {
            description: rlsResult.userMessage,
            duration: 5000,
          });
        }
        throw error;
      }
    },
    enabled: !!authState.user?.id,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
    refetchOnWindowFocus: true,
  });
};
