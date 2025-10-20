import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LoadingScreen from "@/components/LoadingScreen";
import { sreLogger } from '@/lib/sre-logger';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        sreLogger.debug('Auth callback started', { component: 'AuthCallback' });
        
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          sreLogger.error('Session error', { component: 'AuthCallback' }, sessionError as Error);
          throw sessionError;
        }

        sreLogger.debug('Session found', { 
          hasSession: !!session, 
          userEmail: session?.user?.email,
          component: 'AuthCallback'
        });

        if (session) {
          // Check if user has completed onboarding
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError) {
            sreLogger.error('Profile error', { userId: session.user.id, component: 'AuthCallback' }, profileError as Error);
            throw profileError;
          }

          sreLogger.debug('Profile found', { 
            hasProfile: !!profile, 
            role: profile?.role, 
            onboardingCompleted: profile?.onboarding_completed,
            component: 'AuthCallback'
          });

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
              sreLogger.warn('Create profile via callback failed', { userId: session.user.id, component: 'AuthCallback' });
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
              case 'user':
              case 'moderator':
              default:
                navigate('/spaces', { replace: true });
                break;
            }
          } else {
            sreLogger.debug('Redirecting to onboarding', { userId: session.user.id, component: 'AuthCallback' });
            navigate("/onboarding", { replace: true });
          }
        } else {
          sreLogger.debug('No session, redirecting to login', { component: 'AuthCallback' });
          navigate("/login", { replace: true });
        }
      } catch (error) {
        sreLogger.error("Auth callback error", { component: 'AuthCallback' }, error as Error);
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
