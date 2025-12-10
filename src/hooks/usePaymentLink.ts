import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseISO } from 'date-fns';

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

        // Fetch workspace details (prices and host_id) from workspaces table
        const { data: workspace, error: wsError } = await supabase
          .from('workspaces')
          .select('price_per_hour, price_per_day, host_id')
          .eq('id', booking.space_id)
          .single();

        // Cast to handle missing types if needed
        const workspaceData = workspace as any;

        if (wsError || !workspaceData) {
          console.error('Workspace fetch error:', wsError);
          toast.error('Spazio non trovato');
          navigate('/bookings', { replace: true });
          return;
        }

        // Fetch host profile for Stripe account
        const { data: hostProfile, error: profileError } = await supabase
          .from('profiles')
          .select('stripe_account_id')
          .eq('id', workspaceData.host_id)
          .single();

        if (profileError || !hostProfile?.stripe_account_id) {
          toast.error('Host non collegato a Stripe');
          navigate('/bookings', { replace: true });
          return;
        }

        // Calculate duration
        const startTime = parseISO(`${booking.booking_date}T${booking.start_time}`);
        const endTime = parseISO(`${booking.booking_date}T${booking.end_time}`);
        const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        // Create payment session
        const { data, error } = await supabase.functions.invoke('create-payment-session', {
          body: {
            space_id: booking.space_id,
            durationHours,
            pricePerHour: workspaceData.price_per_hour,
            pricePerDay: workspaceData.price_per_day,
            host_stripe_account_id: hostProfile.stripe_account_id,
            booking_id: booking.id,
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
