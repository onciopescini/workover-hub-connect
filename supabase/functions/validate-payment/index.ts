
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 Validate payment function started');

    // Verifica delle variabili d'ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      console.error('🔴 STRIPE_SECRET_KEY not found');
      throw new Error('Stripe configuration missing');
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('🔴 Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Parse request body
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Missing session_id parameter');
    }

    console.log('🔵 Validating payment session:', session_id);

    // Recupera la sessione da Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new Error('Session not found');
    }

    console.log('🔵 Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status
    });

    const isPaymentSuccessful = session.payment_status === 'paid' && session.status === 'complete';
    
    if (isPaymentSuccessful && session.metadata?.booking_id) {
      // Aggiorna il pagamento nel database
      const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .update({
          payment_status: 'completed',
          receipt_url: session.receipt_url,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_session_id', session_id);

      if (paymentError) {
        console.error('🔴 Error updating payment:', paymentError);
      } else {
        console.log('✅ Payment updated successfully');
      }

      // Aggiorna la prenotazione
      const { error: bookingError } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.metadata.booking_id);

      if (bookingError) {
        console.error('🔴 Error updating booking:', bookingError);
      } else {
        console.log('✅ Booking confirmed successfully');
      }
    }

    return new Response(JSON.stringify({
      success: isPaymentSuccessful,
      payment_status: session.payment_status,
      session_status: session.status,
      booking_id: session.metadata?.booking_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('🔴 Error in validate-payment function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
