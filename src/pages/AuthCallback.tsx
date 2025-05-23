
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LoadingScreen from "@/components/LoadingScreen";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          // Let the centralized redirect logic in AuthContext handle the routing
          // Just wait a moment for the profile to load
          setTimeout(() => {
            // If still on callback page after 3 seconds, something went wrong
            if (window.location.pathname === '/auth/callback') {
              navigate("/dashboard", { replace: true });
            }
          }, 3000);
        } else {
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setError("Authentication failed. Please try signing in again.");
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      {error ? (
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600">Redirecting to login page...</p>
        </div>
      ) : (
        <LoadingScreen />
      )}
    </div>
  );
};

export default AuthCallback;
