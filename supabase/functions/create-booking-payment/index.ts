import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    console.log('[BOOKING-PAYMENT] Starting payment creation');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');

    const { bookingId } = await req.json();
    if (!bookingId) throw new Error('Booking ID required');

    console.log('[BOOKING-PAYMENT] Processing booking:', bookingId);

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        space:spaces (
          *,
          host:profiles!spaces_host_id_fkey (*)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');
    if (booking.user_id !== user.id) throw new Error('Unauthorized');

    console.log('[BOOKING-PAYMENT] Booking loaded:', booking.id);

    // Calculate amount
    const space = booking.space as any;
    const host = space.host as any;
    
    // Calculate hours
    const startTime = new Date(`1970-01-01T${booking.start_time}`);
    const endTime = new Date(`1970-01-01T${booking.end_time}`);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    const baseAmount = space.price_per_hour * hours;
    const platformFee = baseAmount * 0.15; // 15% platform fee
    const totalAmount = Math.round(baseAmount * 100); // Convert to cents
    const hostAmount = Math.round((baseAmount - platformFee) * 100);

    console.log('[BOOKING-PAYMENT] Amounts calculated:', {
      baseAmount,
      platformFee,
      totalAmount: totalAmount / 100,
      hostAmount: hostAmount / 100
    });

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Get or create customer
    let customerId: string | undefined;
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    console.log('[BOOKING-PAYMENT] Customer ID:', customerId);

    // Get host's Stripe Connect account
    const { data: stripeAccount } = await supabaseClient
      .from('stripe_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('user_id', host.id)
      .maybeSingle();

    if (!stripeAccount?.stripe_account_id) {
      throw new Error('Host has not connected Stripe account');
    }

    if (!stripeAccount.charges_enabled) {
      throw new Error('Host Stripe account is not ready to receive payments');
    }

    console.log('[BOOKING-PAYMENT] Host Stripe account:', stripeAccount.stripe_account_id);

    // Create payment intent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      customer: customerId,
      application_fee_amount: totalAmount - hostAmount,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      metadata: {
        booking_id: bookingId,
        user_id: user.id,
        host_id: host.id,
        space_id: space.id,
      },
      description: `Booking for ${space.title} - ${booking.booking_date}`,
    });

    console.log('[BOOKING-PAYMENT] Payment intent created:', paymentIntent.id);

    // Update booking with payment session
    await supabaseClient
      .from('bookings')
      .update({
        payment_session_id: paymentIntent.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    // Create payment record
    await supabaseClient.from('payments').insert({
      booking_id: bookingId,
      user_id: user.id,
      amount: totalAmount / 100,
      platform_fee: platformFee,
      host_amount: hostAmount / 100,
      payment_status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      payment_method: 'stripe',
      metadata: {
        customer_id: customerId,
        host_stripe_account: stripeAccount.stripe_account_id
      }
    });

    console.log('[BOOKING-PAYMENT] Payment record created');

    return new Response(JSON.stringify({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount / 100,
      paymentIntentId: paymentIntent.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[BOOKING-PAYMENT] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
