
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SpaceForm } from "@/components/spaces/SpaceForm";
import { toast } from "sonner";
import { checkSpaceCreationRestriction } from "@/lib/space-moderation-utils";

const SpaceNew = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  // Verifico se l'host può creare spazi o è limitato
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
  }, [authState.user, authState.profile]);

  // Garantisco che solo gli host possano accedere
  useEffect(() => {
    if (authState.profile && authState.profile.role !== "host") {
      toast.error("Solo gli host possono creare spazi");
      navigate("/dashboard");
    }
  }, [authState.profile, navigate]);

  if (authState.isLoading) {
    return <div className="flex justify-center items-center h-screen">Caricamento...</div>;
  }

  if (!authState.user || authState.profile?.role !== "host") {
    return null;
  }

  return (
    <AppLayout
      title="Add New Space"
      subtitle="Create a new space for coworkers to use"
    >
      <SpaceForm />
    </AppLayout>
  );
};

export default SpaceNew;
