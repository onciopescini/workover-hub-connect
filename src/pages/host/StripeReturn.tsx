import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';

const StripeReturn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const state = searchParams.get('state');

  useEffect(() => {
    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        await refreshProfile();
        if (state === 'success') {
          toast.success('Onboarding Stripe completato! Puoi ora accettare pagamenti.');
        } else if (state === 'refresh') {
          toast.warning('Onboarding Stripe interrotto. Puoi riprovare dalla dashboard.');
        }
      } finally {
        setIsRefreshing(false);
      }
    };
    refreshData();
  }, [state, refreshProfile]);

  // UI minimale: titolo + pulsante per tornare alla dashboard host
  return (
    <div className="max-w-xl mx-auto p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">
        {state === 'success'
          ? 'Onboarding completato'
          : state === 'refresh'
          ? 'Onboarding interrotto'
          : 'Stato sconosciuto'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {isRefreshing
          ? 'Aggiornamento dello stato in corso...'
          : state === 'success'
          ? 'Il tuo account Stripe è configurato.'
          : state === 'refresh'
          ? 'Puoi riprovare in qualsiasi momento.'
          : 'Controlla la tua dashboard per i dettagli.'}
      </p>
      <button
        onClick={() => navigate('/host')}
        className="btn btn-primary w-full"
      >
        Vai alla Dashboard Host
      </button>
    </div>
  );
};

export default StripeReturn;