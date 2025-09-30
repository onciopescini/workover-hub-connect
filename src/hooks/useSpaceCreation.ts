
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { checkSpaceCreationRestriction } from "@/lib/space-moderation-utils";
import { sreLogger } from '@/lib/sre-logger';

export const useSpaceCreation = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  sreLogger.debug('useSpaceCreation: Current auth state', {
    isLoading: authState.isLoading,
    userId: authState.user?.id,
    role: authState.profile?.role
  });

  // Check if the host can create spaces or is limited
  useEffect(() => {
    const checkRestriction = async () => {
      if (authState.user && authState.profile?.role === 'host') {
        sreLogger.debug('Checking space creation restrictions for host', { userId: authState.user.id });
        try {
          const isRestricted = await checkSpaceCreationRestriction();
          if (isRestricted) {
            toast.error("Non puoi creare nuovi spazi. Hai uno spazio sospeso che richiede la tua attenzione.");
            navigate('/host/spaces');
          }
        } catch (error) {
          sreLogger.error('Error checking space creation restriction', { userId: authState.user.id }, error as Error);
        }
      }
    };
    
    checkRestriction();
  }, [authState.user, authState.profile, navigate]);

  // Ensure only hosts can access
  useEffect(() => {
    if (authState.profile && authState.profile.role !== "host") {
      sreLogger.warn('Non-host trying to access space creation', { role: authState.profile.role, userId: authState.user?.id });
      toast.error("Solo gli host possono creare spazi");
      navigate("/dashboard");
    }
  }, [authState.profile, navigate]);

  return {
    authState,
    isLoading: authState.isLoading,
    canAccess: authState.user && authState.profile?.role === "host"
  };
};
