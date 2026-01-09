import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/constants';

export const usePaymentLink = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handlePaymentLink = async () => {
      const searchParams = new URLSearchParams(location.search);
      const payBookingId = searchParams.get('pay');

      if (!payBookingId) return;

      try {
        // Fetch booking details
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', payBookingId)
          .single();

        if (bookingError || !booking) {
          toast.error('Prenotazione non trovata');
          navigate('/bookings', { replace: true });
          return;
        }

        if (booking.status !== 'pending_payment' && booking.status !== 'pending') {
          toast.error('Questa prenotazione non richiede pagamento');
          navigate('/bookings', { replace: true });
          return;
        }

        // Fetch workspace and host details mainly for validation
        const { data: workspace, error: wsError } = await supabase
          .from('workspaces')
          .select('host_id')
          .eq('id', booking.space_id)
          .single();

        if (wsError || !workspace) {
          console.error('Workspace fetch error:', wsError);
          toast.error('Spazio non trovato');
          navigate('/bookings', { replace: true });
          return;
        }

        // Validate host Stripe account
        const { data: hostProfile, error: profileError } = await supabase
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', workspace.host_id ?? '')
          .single();

        if (profileError || !hostProfile?.stripe_account_id) {
          toast.error('Host non collegato a Stripe');
          navigate('/bookings', { replace: true });
          return;
        }

        // Create checkout session using v3
        const { data, error } = await supabase.functions.invoke(API_ENDPOINTS.CREATE_CHECKOUT, {
          body: {
            booking_id: booking.id,
            origin: window.location.origin
          },
        });

        if (error || !data?.url) {
          toast.error('Errore nella creazione della sessione di pagamento');
          navigate('/bookings', { replace: true });
          return;
        }

        // Remove the pay parameter from URL
        navigate('/bookings', { replace: true });
        
        // Open Stripe checkout
        window.open(data.url, '_blank');
      } catch (error) {
        console.error('Error processing payment link:', error);
        toast.error('Errore nel processo di pagamento');
        navigate('/bookings', { replace: true });
      }
    };

    handlePaymentLink();
  }, [location.search, navigate]);
};
