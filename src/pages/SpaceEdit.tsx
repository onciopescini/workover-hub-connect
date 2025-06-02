
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6 flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/spaces/manage')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna ai Spazi
          </Button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Errore</h1>
          <p className="text-gray-600 mb-4">{error || "Could not load the space"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6 flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/spaces/manage')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna ai Spazi
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modifica Spazio</h1>
          <p className="text-gray-600">Modifica "{space.title}"</p>
        </div>
      </div>
      <SpaceForm initialData={space} isEdit={true} />
    </div>
  );
};

export default SpaceEdit;
