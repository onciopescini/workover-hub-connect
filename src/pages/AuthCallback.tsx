
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

          // Se il profilo non esiste, prova a crearlo e manda all'onboarding
          if (!profile) {
            try {
              const firstName = (session.user.user_metadata?.['given_name']
                || session.user.user_metadata?.['first_name']
                || (session.user.user_metadata?.['full_name'] as string | undefined)?.split(' ')[0]
                || '');
              const lastName = (session.user.user_metadata?.['family_name']
                || session.user.user_metadata?.['last_name']
                || (session.user.user_metadata?.['full_name'] as string | undefined)?.split(' ').slice(1).join(' ')
                || '');
              await supabase.functions.invoke('create-profile', {
                body: {
                  user_id: session.user.id,
                  email: session.user.email,
                  first_name: firstName,
                  last_name: lastName,
                }
              });
            } catch (e) {
              console.warn('Create profile via callback failed', e);
            }
            navigate("/onboarding", { replace: true });
            return;
          }

          if (profile?.onboarding_completed) {
            // Redirect based on role
            switch (profile.role) {
              case 'admin':
                navigate('/admin/users', { replace: true });
                break;
              case 'host':
                navigate('/host/dashboard', { replace: true });
                break;
              case 'coworker':
              default:
                navigate('/spaces', { replace: true });
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
