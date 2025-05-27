
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
    console.log('🔵 Create payment session function started');

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

    console.log('🔵 Environment variables verified');

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Verifica autenticazione
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('🔴 Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔵 Extracting user from token');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('🔴 Authentication failed:', authError);
      throw new Error('Invalid authentication');
    }

    console.log('🔵 User authenticated:', user.id);

    // Parse request body
    const { booking_id, amount, currency, user_id } = await req.json();

    if (!booking_id || !amount || !user_id) {
      throw new Error('Missing required parameters: booking_id, amount, user_id');
    }

    console.log('🔵 Creating payment session for:', { booking_id, amount, currency });

    // Verifica che la prenotazione esista e appartenga all'utente
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        spaces:space_id(title, host_id)
      `)
      .eq('id', booking_id)
      .eq('user_id', user_id)
      .single();

    if (bookingError || !booking) {
      console.error('🔴 Booking not found or unauthorized:', bookingError);
      throw new Error('Booking not found or unauthorized');
    }

    console.log('🔵 Booking verified:', booking.id);

    // Controlla se esiste già un customer Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('🔵 Existing Stripe customer found:', customerId);
    } else {
      // Crea nuovo customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;
      console.log('🔵 New Stripe customer created:', customerId);
    }

    // Crea sessione di checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: currency || 'EUR',
            product_data: {
              name: `Prenotazione: ${booking.spaces.title}`,
              description: `Prenotazione per il ${booking.booking_date}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/bookings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/bookings?payment=cancelled`,
      metadata: {
        booking_id: booking_id,
        user_id: user_id
      }
    });

    console.log('🔵 Checkout session created:', session.id);

    // Registra il pagamento nel database come pending
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user_id,
        booking_id: booking_id,
        amount: amount,
        currency: currency || 'EUR',
        payment_status: 'pending',
        method: 'stripe',
        stripe_session_id: session.id
      });

    if (paymentError) {
      console.error('🔴 Error recording payment:', paymentError);
      // Non bloccare il processo, continua comunque
    } else {
      console.log('🔵 Payment recorded in database');
    }

    return new Response(JSON.stringify({
      session_id: session.id,
      payment_url: session.url,
      booking_id: booking_id,
      amount: amount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('🔴 Error in create-payment-session function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
