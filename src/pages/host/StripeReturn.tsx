import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';

const StripeReturn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const state = searchParams.get('state');

  useEffect(() => {
    (async () => {
      try {
        await refreshProfile?.();
        if (state === 'success') toast.success('Onboarding Stripe completato!');
        else if (state === 'refresh') toast.warning('Onboarding interrotto, puoi riprovare.');
      } catch {/* no-op */}
    })();
  }, [state, refreshProfile]);

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-2">Collegamento Stripe</h1>
      <p className="mb-4">
        {state === 'success'
          ? 'Il tuo account Stripe è stato configurato correttamente.'
          : state === 'refresh'
          ? 'Onboarding interrotto. Puoi riprovare dalla tua dashboard.'
          : 'Stato sconosciuto. Torna alla dashboard.'}
      </p>
      <button className="btn btn-primary w-full" onClick={() => navigate('/host')}>
        Vai alla Dashboard Host
      </button>
    </div>
  );
};

export default StripeReturn;