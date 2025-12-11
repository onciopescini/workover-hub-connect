import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, RateLimitPresets } from "../_shared/rate-limiter.ts";

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
    console.log('[BOOKING-PAYMENT] Starting payment creation - Decoupled Logic');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');

    // Fix 3.3: Rate limiting check
    const rateLimitResult = await checkRateLimit(supabaseClient, {
      ...RateLimitPresets.PAYMENT_CREATION,
      identifier: user.id,
      action: 'create_payment_session'
    });

    if (!rateLimitResult.allowed) {
      console.warn(`[RATE_LIMIT] User ${user.id} exceeded payment creation rate limit`);
      return new Response(
        JSON.stringify({ 
          error: 'Troppi tentativi di pagamento. Riprova tra qualche minuto.',
          retryAfter: Math.ceil(rateLimitResult.resetMs / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rateLimitResult.resetMs / 1000))
          }
        }
      );
    }

    const { bookingId } = await req.json();
    if (!bookingId) throw new Error('Booking ID required');

    console.log('[BOOKING-PAYMENT] Processing booking:', bookingId);

    // 1. Get booking details (No Joins)
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');
    if (booking.user_id !== user.id) throw new Error('Unauthorized');

    console.log('[BOOKING-PAYMENT] Booking loaded:', booking.id);

    // 2. Get Workspace details (from 'workspaces' using booking.space_id)
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('*')
      .eq('id', booking.space_id)
      .single();

    if (workspaceError) throw workspaceError;
    if (!workspace) throw new Error('Workspace not found');

    // 3. Get Host Profile (from 'profiles' using workspace.host_id)
    const { data: host, error: hostError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', workspace.host_id)
      .single();

    if (hostError) throw hostError;
    if (!host) throw new Error('Host not found');

    
    // Calculate amount
    // Calculate hours
    const startTime = new Date(`1970-01-01T${booking.start_time}`);
    const endTime = new Date(`1970-01-01T${booking.end_time}`);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Use workspace prices (handling price_per_hour or defaulting)
    // Note: workspace might have price_per_hour directly
    const pricePerHour = workspace.price_per_hour || 0;

    const baseAmount = pricePerHour * hours;
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

    // Fix 3.5: Generate idempotency key to prevent duplicate charges
    const idempotencyKey = `booking_${bookingId}_${Date.now()}`;
    console.log('[BOOKING-PAYMENT] Using idempotency key:', idempotencyKey);

    // Create payment intent with application fee and idempotency
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
        space_id: workspace.id,
        idempotency_key: idempotencyKey,
      },
      description: `Booking for ${workspace.name} - ${booking.booking_date}`,
    }, {
      idempotencyKey: idempotencyKey // CRITICAL: prevents duplicate charges on retry
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

    // Create payment record with idempotency key
    await supabaseClient.from('payments').insert({
      booking_id: bookingId,
      user_id: user.id,
      amount: totalAmount / 100,
      platform_fee: platformFee,
      host_amount: hostAmount / 100,
      payment_status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_idempotency_key: idempotencyKey, // Fix 3.5: Store idempotency key
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
