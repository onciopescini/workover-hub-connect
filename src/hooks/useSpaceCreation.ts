
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { checkSpaceCreationRestriction } from "@/lib/space-moderation-utils";

export const useSpaceCreation = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  console.log('🔍 useSpaceCreation: Current auth state', {
    isLoading: authState.isLoading,
    user: authState.user?.id,
    profile: authState.profile,
    role: authState.profile?.role
  });

  // Check if the host can create spaces or is limited
  useEffect(() => {
    const checkRestriction = async () => {
      if (authState.user && authState.profile?.role === 'host') {
        console.log('🔍 Checking space creation restrictions for host');
        try {
          const isRestricted = await checkSpaceCreationRestriction();
          if (isRestricted) {
            toast.error("Non puoi creare nuovi spazi. Hai uno spazio sospeso che richiede la tua attenzione.");
            navigate('/host/spaces');
          }
        } catch (error) {
          console.error('Error checking space creation restriction:', error);
        }
      }
    };
    
    checkRestriction();
  }, [authState.user, authState.profile, navigate]);

  // Ensure only hosts can access
  useEffect(() => {
    if (authState.profile && authState.profile.role !== "host") {
      console.log('🚫 Non-host trying to access space creation:', authState.profile.role);
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
