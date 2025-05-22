
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create a New Space</h1>
          <p className="text-gray-600 mt-2">
            Fill out the form below to list your space for coworkers
          </p>
        </div>

        <SpaceForm />
      </div>
    </div>
  );
};

export default SpaceNew;
