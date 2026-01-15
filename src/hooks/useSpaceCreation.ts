import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { sreLogger } from "@/lib/sre-logger";
import { toast } from "sonner";

const useSpaceCreation = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const restrictionQuery = useQuery({
    queryKey: ['space-restriction', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return { isRestricted: false };

      const { data: profile } = await supabase
        .from('profiles')
        .select('space_creation_restricted')
        .eq('id', authState.user.id)
        .single();

      return {
        isRestricted: profile?.space_creation_restricted === true
      };
    },
    enabled: !!authState.user,
  });

  // Check for space creation restrictions
  useEffect(() => {
    const checkRestriction = async () => {
      if (restrictionQuery.data?.isRestricted) {
        sreLogger.warn('Space creation restricted', { userId: authState.user?.id });
        toast.error("La creazione di spazi è stata temporaneamente limitata per il tuo account");
        navigate("/host/dashboard");
      }
    };
    
    checkRestriction();
  }, [authState.user, authState.profile, navigate, restrictionQuery.data]);

  // Ensure only hosts can access
  useEffect(() => {
    if (authState.profile && !(authState.roles || []).includes('host')) {
      sreLogger.warn('Non-host trying to access space creation', { roles: authState.roles, userId: authState.user?.id });
      toast.error("Solo gli host possono creare spazi");
      navigate("/dashboard");
    }
  }, [authState.profile, authState.roles, navigate, authState.user?.id]);

  return {
    authState,
    isLoading: authState.isLoading,
    canAccess: authState.user && (authState.roles || []).includes('host')
  };
};

export default useSpaceCreation;
