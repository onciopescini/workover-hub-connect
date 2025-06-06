
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
        console.log('Auth callback started');
        
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        console.log('Session found:', !!session, session?.user?.email);

        if (session) {
          // Check if user has completed onboarding
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile error:', profileError);
            throw profileError;
          }

          console.log('Profile found:', !!profile, profile?.role, profile?.onboarding_completed);

          if (profile?.onboarding_completed) {
            // Redirect based on role
            switch (profile.role) {
              case 'admin':
                navigate('/admin', { replace: true });
                break;
              case 'host':
                navigate('/host', { replace: true });
                break;
              case 'coworker':
              default:
                navigate('/dashboard', { replace: true });
                break;
            }
          } else {
            console.log('Redirecting to onboarding');
            navigate("/onboarding", { replace: true });
          }
        } else {
          console.log('No session, redirecting to login');
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setError("Errore durante l'autenticazione. Prova ad accedere di nuovo.");
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
          <p className="text-gray-600">Reindirizzamento alla pagina di login...</p>
        </div>
      ) : (
        <div className="text-center">
          <LoadingScreen />
          <p className="mt-4 text-gray-600">Completando l'autenticazione...</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
