
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import SpaceForm from "@/components/spaces/SpaceForm";

const SpaceNew = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  // Redirect non-hosts to their dashboard
  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <AppLayout 
      title="Crea Nuovo Spazio" 
      subtitle="Compila il form per pubblicare il tuo spazio per coworker"
    >
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <SpaceForm />
      </div>
    </AppLayout>
  );
};

export default SpaceNew;
