import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle OPTIONS immediately for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // -------------------------------------------------------------------------
    // 1. DEPLOYMENT CONFIRMATION LOG
    // -------------------------------------------------------------------------
    console.log("🚀 CHECKOUT V3 - FIXED IMPORTS & SPACES TABLE 🚀");
    console.log("Timestamp:", new Date().toISOString());

    // 2. Read Request Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Error parsing JSON body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid Request Body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-CHECKOUT-V3] Payload:', JSON.stringify(body, null, 2));

    const { booking_id } = body;
    if (!booking_id) {
      throw new Error('Missing booking_id');
    }

    // 3. Setup Clients
    // Client for Auth (User Context) - used to verify the caller
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Admin Client for Database Operations (Bypassing RLS for reliable fetching)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Authenticate User
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[CREATE-CHECKOUT-V3] User authenticated:', user.id);

    // -------------------------------------------------------------------------
    // 5. SEQUENTIAL FETCHING (Decoupled, No Joins)
    // -------------------------------------------------------------------------

    // A. Fetch Booking
    console.log('[1/3] Fetching Booking:', booking_id);
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('[1/3] Booking Error:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: Schema uses space_id
    const spaceId = booking.space_id;
    console.log('[1/3] Booking Found. Space ID:', spaceId);

    // B. Fetch Space (using 'spaces' table as requested)
    console.log('[2/3] Fetching Space:', spaceId);
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (spaceError || !space) {
      console.error('[2/3] Space Error (Table: spaces):', spaceError);
      return new Response(
        JSON.stringify({ error: 'Space not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[2/3] Space Found. Host ID:', space.host_id);

    // C. Fetch Host Profile
    console.log('[3/3] Fetching Host Profile:', space.host_id);
    const { data: hostProfile, error: hostProfileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', space.host_id)
      .single();

    if (hostProfileError || !hostProfile) {
       console.error('[3/3] Host Profile Error:', hostProfileError);
       return new Response(
        JSON.stringify({ error: 'Host profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hostProfile.stripe_account_id) {
       console.error('[3/3] Host has NO Stripe Account ID');
       return new Response(
        JSON.stringify({ error: 'Host is not connected to Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[3/3] Host Stripe ID:', hostProfile.stripe_account_id);


    // -------------------------------------------------------------------------
    // 6. PRICING LOGIC (Advanced V2 Logic)
    // -------------------------------------------------------------------------
    const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
    const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    console.log('Duration (Hours):', durationHours);
    if (durationHours <= 0) throw new Error('Invalid duration');

    let unitPrice = 0;

    // LOGIC:
    // If duration < 8h & price_per_hour exists: use hourly rate * duration.
    // Else: use daily rate (price_per_day).

    if (durationHours < 8 && space.price_per_hour) {
        console.log(`[PRICING] Using Hourly Rate: ${space.price_per_hour} * ${durationHours}h`);
        unitPrice = space.price_per_hour * durationHours;
    } else {
        console.log(`[PRICING] Using Daily Rate Fallback (Duration: ${durationHours}h, Hourly: ${space.price_per_hour}, Daily: ${space.price_per_day})`);
        if (space.price_per_day) {
            unitPrice = space.price_per_day;
        } else {
            // Fallback if price_per_day is somehow missing, though it's mandatory
            console.error('[PRICING] Missing price_per_day!');
            throw new Error('Applicable price (Daily) not defined for this space');
        }
    }

    const guests = booking.guests_count || 1;
    const basePrice = unitPrice * guests;

    // Fees: 5% Service + 22% VAT on Service
    const serviceFeePct = 0.05;
    const vatPct = 0.22;
    const serviceFee = basePrice * serviceFeePct;
    const vat = serviceFee * vatPct;
    const totalPlatformFee = serviceFee + vat;

    const totalPrice = basePrice + totalPlatformFee;

    // -------------------------------------------------------------------------
    // 7. STRIPE SESSION
    // -------------------------------------------------------------------------
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Convert to CENTS (Integer)
    const unitAmountCents = Math.round(totalPrice * 100);
    const applicationFeeCents = Math.round(totalPlatformFee * 100);

    console.log('CALCULATED FINAL VALUES (Cents):', {
        basePrice,
        totalPlatformFee,
        totalPrice,
        unitAmountCents,
        applicationFeeCents
    });

    // Safety Check: Fee cannot exceed Total
    if (applicationFeeCents >= unitAmountCents) {
        throw new Error(`Fee (${applicationFeeCents}) cannot equal or exceed total (${unitAmountCents})`);
    }

    // Prepare Invoice Metadata
    let invoiceMetadata: Record<string, string> = {
        booking_id: booking_id,
        user_id: user.id,
        base_amount: String(basePrice)
    };

    if (booking.fiscal_data) {
        // Flatten and stringify fiscal data for Stripe Metadata
        const fiscalFlat: Record<string, string> = {};
        for (const [key, value] of Object.entries(booking.fiscal_data)) {
            if (value === null || value === undefined) continue;
            // Stripe metadata must be strings and < 500 chars
            fiscalFlat[key] = String(value).substring(0, 500);
        }

        invoiceMetadata = {
            ...invoiceMetadata,
            ...fiscalFlat
        };
        console.log('[STRIPE] Adding fiscal data to metadata', invoiceMetadata);
    }

    const sessionData = {
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: space.name,
              description: `Booking for ${booking.booking_date} (${durationHours}h) - ${guests} Guest(s)`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/spaces/${spaceId}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/spaces/${spaceId}?canceled=true`,
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: {
          destination: hostProfile.stripe_account_id,
        },
        metadata: invoiceMetadata
      },
      metadata: invoiceMetadata,
    };

    console.log('[STRIPE] Creating Session...');
    const session = await stripe.checkout.sessions.create(sessionData);
    console.log('[STRIPE] Session Created:', session.id);

    // -------------------------------------------------------------------------
    // 8. INSERT PAYMENT RECORD
    // -------------------------------------------------------------------------
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking_id,
        user_id: user.id,
        amount: Number(totalPrice.toFixed(2)),
        currency: 'EUR',
        payment_status: 'pending',
        stripe_session_id: session.id,
        host_amount: Number(basePrice.toFixed(2)),
        platform_fee: Number(totalPlatformFee.toFixed(2)),
        method: 'stripe'
      });

    if (paymentError) {
        console.error('[PAYMENT-RECORD] Insert Error (Non-blocking):', paymentError);
    } else {
        console.log('[PAYMENT-RECORD] Inserted successfully');
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREATE-CHECKOUT-V3] FATAL ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
