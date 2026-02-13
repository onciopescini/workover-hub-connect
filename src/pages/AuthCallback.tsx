import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LoadingScreen from '@/components/LoadingScreen';
import { sreLogger } from '@/lib/sre-logger';

const FALLBACK_ROUTE = '/dashboard';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const requestedReturnUrl = searchParams.get('returnUrl');
  const returnUrl = requestedReturnUrl?.startsWith('/') ? requestedReturnUrl : null;

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) {
          return;
        }

        if (!session) {
          navigate('/login', { replace: true });
          return;
        }

        if (returnUrl) {
          navigate(returnUrl, { replace: true });
          return;
        }

        navigate(FALLBACK_ROUTE, { replace: true });
      } catch (callbackError: unknown) {
        sreLogger.error('Auth callback error', { component: 'AuthCallback' }, callbackError as Error);

        if (!isMounted) {
          return;
        }

        setError("Errore durante l'autenticazione. Prova ad accedere di nuovo.");
        window.setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2500);
      }
    };

    void handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, returnUrl, searchParams]);

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
