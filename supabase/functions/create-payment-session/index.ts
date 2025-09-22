
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Payment calculator with dual commission model
function calculatePaymentBreakdown(baseAmount: number) {
  const buyerFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100;
  const buyerTotalAmount = baseAmount + buyerFeeAmount;
  
  const hostFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100;
  const hostNetPayout = baseAmount - hostFeeAmount;
  
  const platformRevenue = buyerFeeAmount + hostFeeAmount;

  return {
    baseAmount,
    buyerFeeAmount,
    buyerTotalAmount,
    hostFeeAmount,
    hostNetPayout,
    platformRevenue
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ErrorHandler.logInfo('Create payment session started');

    // Validate environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Read pricing environment variables
    const serviceFeePct = Number(Deno.env.get('SERVICE_FEE_PCT') ?? '0.12');
    const vatPct = Number(Deno.env.get('DEFAULT_VAT_PCT') ?? '0.22');
    const stripeTaxEnabled = Deno.env.get('ENABLE_STRIPE_TAX') === 'true';
    
    // Get the origin from the request to build correct redirect URLs
    const origin = req.headers.get('origin') ?? (Deno.env.get('SITE_URL') ?? 'https://workover.example');

    if (!stripeSecretKey) {
      ErrorHandler.logError('STRIPE_SECRET_KEY not found', null, { operation: 'env_validation' });
      throw new Error('Stripe configuration missing');
    }

    if (!supabaseUrl || !serviceRoleKey) {
      ErrorHandler.logError('Supabase configuration missing', null, { operation: 'env_validation' });
      throw new Error('Supabase configuration missing');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Parse request body
    const { booking_id, base_amount, currency = "EUR", user_id } = await req.json();

    if (!booking_id || !base_amount || !user_id) {
      throw new Error('Missing required parameters');
    }

    ErrorHandler.logInfo('Creating payment session', {
      booking_id,
      base_amount,
      currency,
      user_id
    });

    // Calculate breakdown
    const breakdown = calculatePaymentBreakdown(base_amount);

    // Get booking and space details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        spaces!inner (
          id,
          title,
          host_id,
          confirmation_type,
          profiles!inner (
            stripe_account_id,
            stripe_connected
          )
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      ErrorHandler.logError('Error fetching booking', bookingError, { 
        operation: 'fetch_booking',
        booking_id 
      });
      throw new Error('Booking not found');
    }

    const hostStripeAccount = booking.spaces.profiles.stripe_account_id;
    const isHostConnected = booking.spaces.profiles.stripe_connected;

    if (!isHostConnected || !hostStripeAccount) {
      throw new Error('Host Stripe account not connected');
    }

    // Create Stripe checkout session with destination charge
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Prenotazione: ${booking.spaces.title}`,
              description: `Prenotazione per ${booking.booking_date}`,
            },
            unit_amount: Math.round(breakdown.buyerTotalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/bookings?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/bookings?cancelled=true`,
      metadata: {
        booking_id: booking_id,
        base_amount: base_amount.toString(),
        user_id: user_id,
        host_id: booking.spaces.host_id,
        space_id: booking.spaces.id,
        buyer_fee: breakdown.buyerFeeAmount.toString(),
        host_fee: breakdown.hostFeeAmount.toString(),
        platform_revenue: breakdown.platformRevenue.toString(),
        host_payout: breakdown.hostNetPayout.toString()
      },
      payment_intent_data: {
        application_fee_amount: Math.round(breakdown.platformRevenue * 100), // Platform fee in cents
        transfer_data: {
          destination: hostStripeAccount,
        },
      },
    });

    ErrorHandler.logSuccess('Stripe session created', {
      sessionId: session.id,
      hostAccount: hostStripeAccount,
      applicationFee: Math.round(breakdown.platformRevenue * 100)
    });

    // Create payment record
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user_id,
        booking_id: booking_id,
        amount: breakdown.buyerTotalAmount,
        currency: currency,
        payment_status: 'pending',
        method: 'stripe',
        stripe_session_id: session.id,
        host_amount: breakdown.hostNetPayout,
        platform_fee: breakdown.platformRevenue
      });

    if (paymentError) {
      ErrorHandler.logError('Error creating payment record', paymentError, {
        operation: 'create_payment_record',
        booking_id,
        session_id: session.id
      });
      throw new Error('Failed to create payment record');
    }

    ErrorHandler.logSuccess('Payment record created successfully');

    return new Response(JSON.stringify({
      payment_url: session.url,
      session_id: session.id,
      breakdown: breakdown
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error in create-payment-session function', error, {
      operation: 'create_payment_session',
      error_message: error.message
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
