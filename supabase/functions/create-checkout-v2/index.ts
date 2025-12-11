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
    // -------------------------------------------------------------------------
    // 1. HEADER LOG (Requirements V4)
    // -------------------------------------------------------------------------
    console.log("🚀 CHECKOUT V2 LIVE 🚀");
    console.log("Timestamp:", new Date().toISOString());

    // 2. Read Request Body
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

    console.log('[CREATE-CHECKOUT-V2] Payload:', JSON.stringify(body, null, 2))

    const { booking_id } = body
    if (!booking_id) {
      throw new Error('Missing booking_id')
    }

    // 3. Setup Clients
    // Client for Auth (User Context)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Admin Client for Database Operations (Bypassing RLS for reliable fetching)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Authenticate User
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[CREATE-CHECKOUT-V2] User authenticated:', user.id)

    // -------------------------------------------------------------------------
    // 5. SEQUENTIAL FETCHING (Decoupled Logic)
    // -------------------------------------------------------------------------

    // A. Fetch Booking
    console.log('[1/3] Fetching Booking:', booking_id)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('[1/3] Booking Error:', bookingError)
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[1/3] Booking Found. Space ID:', booking.space_id)

    // B. Fetch Workspace
    // NOTE: Using 'workspaces' table, NOT 'spaces'
    console.log('[2/3] Fetching Workspace:', booking.space_id)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', booking.space_id)
      .single()

    if (workspaceError || !workspace) {
      console.error('[2/3] Workspace Error:', workspaceError)
      return new Response(
        JSON.stringify({ error: 'Workspace not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[2/3] Workspace Found. Host ID:', workspace.host_id)

    // C. Fetch Host Profile
    console.log('[3/3] Fetching Host Profile:', workspace.host_id)
    const { data: hostProfile, error: hostProfileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', workspace.host_id)
      .single()

    if (hostProfileError || !hostProfile) {
       console.error('[3/3] Host Profile Error:', hostProfileError)
       return new Response(
        JSON.stringify({ error: 'Host profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validation
    if (!hostProfile.stripe_account_id) {
       console.error('[3/3] Host has NO Stripe Account ID')
       return new Response(
        JSON.stringify({ error: 'Host is not connected to Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[3/3] Host Stripe ID:', hostProfile.stripe_account_id)


    // -------------------------------------------------------------------------
    // 6. PRICING LOGIC (Hybrid: Hour vs Day)
    // -------------------------------------------------------------------------
    const startDate = new Date(`${booking.booking_date}T${booking.start_time}`)
    const endDate = new Date(`${booking.booking_date}T${booking.end_time}`)
    const durationMs = endDate.getTime() - startDate.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)

    console.log('Duration (Hours):', durationHours)
    if (durationHours <= 0) throw new Error('Invalid duration')

    let unitPrice = 0
    let isDayRate = false

    // Logic: If >= 8 hours, use Day Rate. Else, use Hourly Rate.
    // Fallbacks included if one rate is missing.
    if (durationHours >= 8) {
        isDayRate = true
        if (workspace.price_per_day) {
            unitPrice = workspace.price_per_day
        } else if (workspace.price_per_hour) {
            unitPrice = workspace.price_per_hour * 8
        } else {
             throw new Error('No price defined for workspace (Day/Hour)')
        }
    } else {
        if (workspace.price_per_hour) {
            unitPrice = workspace.price_per_hour * durationHours
        } else if (workspace.price_per_day) {
            // Pro-rate day rate? Or strict?
            // Standard approach: Day Rate / 8 * hours
            unitPrice = (workspace.price_per_day / 8) * durationHours
        } else {
            throw new Error('No price defined for workspace (Hour/Day)')
        }
    }

    const guests = booking.guests_count || 1
    const basePrice = unitPrice * guests

    // Fees: 5% Service + 22% VAT on Service
    const serviceFeePct = 0.05
    const vatPct = 0.22
    const serviceFee = basePrice * serviceFeePct
    const vat = serviceFee * vatPct
    const totalPlatformFee = serviceFee + vat

    const totalPrice = basePrice + totalPlatformFee

    // -------------------------------------------------------------------------
    // 7. STRIPE SESSION
    // -------------------------------------------------------------------------
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    const origin = req.headers.get('origin') || 'http://localhost:3000'

    // Convert to CENTS (Integer)
    // Rounding carefully
    const unitAmountCents = Math.round(totalPrice * 100)
    const applicationFeeCents = Math.round(totalPlatformFee * 100)

    console.log('CALCULATED FINAL VALUES (Cents):', {
        basePrice,
        totalPlatformFee,
        totalPrice,
        unitAmountCents,
        applicationFeeCents
    })

    // Safety Check
    if (applicationFeeCents >= unitAmountCents) {
        throw new Error(`Fee (${applicationFeeCents}) cannot equal or exceed total (${unitAmountCents})`)
    }

    const sessionData = {
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: workspace.name,
              description: `Booking for ${booking.booking_date} (${durationHours}h) - ${guests} Guest(s)`,
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

    console.log('[STRIPE] Creating Session...')
    const session = await stripe.checkout.sessions.create(sessionData)
    console.log('[STRIPE] Session Created:', session.id)

    // -------------------------------------------------------------------------
    // 8. INSERT PAYMENT RECORD
    // -------------------------------------------------------------------------
    // Using Admin client to ensure write permissions
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
      })

    if (paymentError) {
        console.error('[PAYMENT-RECORD] Insert Error (Non-blocking):', paymentError)
    } else {
        console.log('[PAYMENT-RECORD] Inserted successfully')
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[CREATE-CHECKOUT-V2] FATAL ERROR:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
