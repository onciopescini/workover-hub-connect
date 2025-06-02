
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SpaceForm from "@/components/spaces/SpaceForm";
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
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Aggiungi Nuovo Spazio</h1>
        <p className="text-gray-600">Crea un nuovo spazio per i coworker</p>
      </div>
      <SpaceForm />
    </div>
  );
};

export default SpaceNew;
