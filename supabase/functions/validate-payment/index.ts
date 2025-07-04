
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ErrorHandler.logInfo('Validate payment function started');

    // Verifica delle variabili d'ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      ErrorHandler.logError('STRIPE_SECRET_KEY not found', null, { operation: 'env_validation' });
      throw new Error('Stripe configuration missing');
    }

    if (!supabaseUrl || !serviceRoleKey) {
      ErrorHandler.logError('Supabase configuration missing', null, { operation: 'env_validation' });
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

    ErrorHandler.logInfo('Validating payment session', { session_id });

    // Recupera la sessione da Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new Error('Session not found');
    }

    ErrorHandler.logInfo('Session retrieved', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status
    });

    const isPaymentSuccessful = session.payment_status === 'paid' && session.status === 'complete';
    
    if (isPaymentSuccessful && session.metadata?.booking_id) {
      // Aggiorna il pagamento nel database - RIMUOVO updated_at che non esiste
      const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .update({
          payment_status: 'completed',
          receipt_url: session.receipt_url
        })
        .eq('stripe_session_id', session_id);

      if (paymentError) {
        ErrorHandler.logError('Error updating payment', paymentError, {
          operation: 'update_payment',
          session_id
        });
      } else {
        ErrorHandler.logSuccess('Payment updated successfully');
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
        ErrorHandler.logError('Error updating booking', bookingError, {
          operation: 'update_booking',
          booking_id: session.metadata.booking_id
        });
      } else {
        ErrorHandler.logSuccess('Booking confirmed successfully');
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
    ErrorHandler.logError('Error in validate-payment function', error, {
      operation: 'validate_payment',
      error_message: error.message
    });
    
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
