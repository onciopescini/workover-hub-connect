
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { toast } from "sonner";
import { checkSpaceCreationRestriction } from "@/lib/space-moderation-utils";

export const useSpaceCreation = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  // Check if the host can create spaces or is limited
  useEffect(() => {
    const checkRestriction = async () => {
      if (authState.user && authState.profile?.role === 'host') {
        const isRestricted = await checkSpaceCreationRestriction();
        if (isRestricted) {
          toast.error("Non puoi creare nuovi spazi. Hai uno spazio sospeso che richiede la tua attenzione.");
          navigate('/spaces/manage');
        }
      }
    };
    
    checkRestriction();
  }, [authState.user, authState.profile, navigate]);

  // Ensure only hosts can access
  useEffect(() => {
    if (authState.profile && authState.profile.role !== "host") {
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
