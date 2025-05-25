
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import SpaceForm from "@/components/spaces/SpaceForm";
import type { Space } from "@/types/space";

const SpaceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-hosts to their dashboard
  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  // Fetch space details
  useEffect(() => {
    const fetchSpace = async () => {
      if (!id || !authState.user) return;

      try {
        const { data, error } = await supabase
          .from("spaces")
          .select("*")
          .eq("id", id)
          .eq("host_id", authState.user.id)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Space not found");
        }

        setSpace(data);
      } catch (err) {
        console.error("Error fetching space:", err);
        setError("Could not load the space. You may not have permission to edit it.");
        toast.error("Failed to load space details");
      } finally {
        setLoading(false);
      }
    };

    fetchSpace();
  }, [id, authState.user]);

  if (authState.profile?.role !== "host") {
    return null;
  }

  if (loading) {
    return (
      <AppLayout title="Caricamento..." subtitle="Sto caricando i dettagli dello spazio">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !space) {
    return (
      <AppLayout 
        title="Errore" 
        subtitle="Impossibile caricare lo spazio"
        customBackUrl="/spaces/manage"
      >
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h1 className="text-2xl font-bold text-red-500 mb-2">Errore</h1>
            <p className="text-gray-600 mb-4">{error || "Could not load the space"}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Modifica Spazio" 
      subtitle={`Modifica "${space.title}"`}
      customBackUrl="/spaces/manage"
    >
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <SpaceForm initialData={space} isEdit={true} />
      </div>
    </AppLayout>
  );
};

export default SpaceEdit;
