
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle OPTIONS immediately
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // FORCE REDEPLOY CHECK
    console.log("DEPLOY CHECK: Decoupled Logic Loaded - Timestamp: " + new Date().toISOString());
    console.log("PAYMENT SESSION v2: Decoupled logic active");

    // 2. Read and Log Request Body immediately
    let body
    try {
      body = await req.json()
    } catch (e) {
      console.error('Error parsing JSON body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid Request Body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('RECEIVED PAYLOAD:', body)
    console.log('[CREATE-PAYMENT-SESSION] Request Body:', JSON.stringify(body, null, 2))

    const { booking_id } = body
    if (!booking_id) {
      throw new Error('Missing booking_id')
    }

    // 3. Setup Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Setup Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Get User
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[CREATE-PAYMENT-SESSION] User authenticated:', user.id)

    // 5. Fetch Booking (Decoupled - Step A)
    console.log('[CREATE-PAYMENT-SESSION] Fetching booking:', booking_id)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('[CREATE-PAYMENT-SESSION] Booking error:', bookingError)
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Calculate Duration
    const startDate = new Date(`${booking.booking_date}T${booking.start_time}`)
    const endDate = new Date(`${booking.booking_date}T${booking.end_time}`)
    const durationMs = endDate.getTime() - startDate.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    console.log('[CREATE-PAYMENT-SESSION] Duration (hours):', durationHours)

    if (durationHours <= 0) {
       return new Response(
        JSON.stringify({ error: 'Invalid booking duration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Fetch Workspace (Decoupled - Step B)
    // IMPORTANT: Using 'workspaces' table and 'space_id' from booking
    console.log('[CREATE-PAYMENT-SESSION] Fetching workspace:', booking.space_id)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, host_id, price_per_hour, price_per_day')
      .eq('id', booking.space_id)
      .single()

    if (workspaceError || !workspace) {
      console.error('[CREATE-PAYMENT-SESSION] Workspace error:', workspaceError)
      return new Response(
        JSON.stringify({ error: 'Workspace not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Fetch Host Profile (Decoupled - Step C)
    console.log('[CREATE-PAYMENT-SESSION] Fetching host profile:', workspace.host_id)
    const { data: hostProfile, error: hostProfileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', workspace.host_id)
      .single()

    if (hostProfileError || !hostProfile) {
       console.error('[CREATE-PAYMENT-SESSION] Host profile error:', hostProfileError)
       return new Response(
        JSON.stringify({ error: 'Host profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!hostProfile.stripe_account_id) {
       console.error('[CREATE-PAYMENT-SESSION] Host has no stripe_account_id')
       return new Response(
        JSON.stringify({ error: 'Host is not connected to Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[CREATE-PAYMENT-SESSION] Host Stripe ID:', hostProfile.stripe_account_id)


    // 9. Calculate Price
    let unitPrice = 0
    let isDayRate = false

    if (durationHours >= 8) {
        isDayRate = true
        if (workspace.price_per_day) {
            unitPrice = workspace.price_per_day
        } else if (workspace.price_per_hour) {
            unitPrice = workspace.price_per_hour * 8
        } else {
             throw new Error('No price defined for workspace')
        }
    } else {
        if (workspace.price_per_hour) {
            unitPrice = workspace.price_per_hour * durationHours
        } else if (workspace.price_per_day) {
            unitPrice = (workspace.price_per_day / 8) * durationHours
        } else {
            throw new Error('No price defined for workspace')
        }
    }

    // Assumptions for fees
    const guests = booking.guests_count || 1
    // Logic from previous file: base = unitPrice * guests
    const basePrice = unitPrice * guests

    // Application Fee (Platform fee) - using env vars or defaults
    const serviceFeePct = 0.05 // 5%
    const vatPct = 0.22 // 22%

    const serviceFee = basePrice * serviceFeePct
    const vat = serviceFee * vatPct
    const totalPlatformFee = serviceFee + vat

    const totalPrice = basePrice + totalPlatformFee

    // Rounding to 2 decimal places for logging/logic
    const roundedTotal = Math.round(totalPrice * 100) / 100
    const roundedPlatformFee = Math.round(totalPlatformFee * 100) / 100

    console.log('[CREATE-PAYMENT-SESSION] Calculated Price:', {
        durationHours,
        isDayRate,
        unitPrice,
        basePrice,
        totalPlatformFee: roundedPlatformFee,
        totalPrice: roundedTotal
    })

    // 10. Create Stripe Session
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    const origin = req.headers.get('origin') || 'http://localhost:3000'

    // Amounts in CENTS
    const unitAmountCents = Math.round(roundedTotal * 100)
    const applicationFeeCents = Math.round(roundedPlatformFee * 100)

    const sessionData = {
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: workspace.name,
              description: `Booking for ${booking.booking_date} (${durationHours}h)`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/bookings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bookings?canceled=true`,
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: {
          destination: hostProfile.stripe_account_id,
        },
        metadata: {
            booking_id: booking_id,
            user_id: user.id
        }
      },
      metadata: {
        booking_id: booking_id,
        user_id: user.id,
      },
    }

    console.log('[CREATE-PAYMENT-SESSION] Creating Stripe Session:', JSON.stringify(sessionData, null, 2))

    const session = await stripe.checkout.sessions.create(sessionData)

    console.log('[CREATE-PAYMENT-SESSION] Session created:', session.id)

    // 11. Insert Payment Record
    // Use Service Role to insert into payments if RLS is strict, or same client if user has permissions.
    // Safest to use Service Role for 'payments' table writes to ensure it works.

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking_id,
        user_id: user.id,
        amount: roundedTotal,
        currency: 'EUR',
        payment_status: 'pending',
        stripe_session_id: session.id,
        host_amount: basePrice, // Approximation, Stripe handles actual split
        platform_fee: roundedPlatformFee,
        method: 'stripe'
      })

    if (paymentError) {
        console.error('[CREATE-PAYMENT-SESSION] Payment insert error:', paymentError)
        // We log but don't fail the request since the session is created.
        // Ideally we should validte this.
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[CREATE-PAYMENT-SESSION] General Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
