// supabase/functions/create-payment-session/index.ts
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { combineHeaders } from '../_shared/security-headers.ts';

// Pricing Types
type PricingInput = {
  durationHours: number;
  pricePerHour: number | null;
  pricePerDay: number | null;
  guestsCount: number;
  serviceFeePct: number;
  vatPct: number;
  stripeTaxEnabled?: boolean;
};

type PricingOutput = {
  base: number;
  serviceFee: number;
  hostFee: number;
  hostVat: number;
  totalPlatformFee: number;
  vat: number;
  total: number;
  isDayRate: boolean;
  breakdownLabel: string;
};

const round = (n: number) => Math.round(n * 100) / 100;

function computePricing(i: PricingInput): PricingOutput {
  // Logic:
  // If duration >= 8 hours -> Use Day Rate
  // Else -> Use Hour Rate
  // Fallbacks applied if preferred rate is missing

  let isDayRate = i.durationHours >= 8;
  let unitPrice = 0;

  if (isDayRate) {
    if (i.pricePerDay !== null) {
      unitPrice = i.pricePerDay;
    } else if (i.pricePerHour !== null) {
      // Fallback: Day rate = 8 * Hour rate
      unitPrice = i.pricePerHour * 8;
    } else {
        throw new Error("Pricing configuration error: No price found");
    }
  } else {
    if (i.pricePerHour !== null) {
      unitPrice = i.pricePerHour * i.durationHours;
    } else if (i.pricePerDay !== null) {
      // Fallback: Hour rate = Day rate / 8
      unitPrice = (i.pricePerDay / 8) * i.durationHours;
    } else {
        throw new Error("Pricing configuration error: No price found");
    }
  }

  // Calculate Base
  // Assumption: Price is per person per unit (day or block of hours)
  const base = unitPrice * i.guestsCount;

  const serviceFee = round(base * i.serviceFeePct);
  const vat = i.stripeTaxEnabled ? 0 : round(serviceFee * i.vatPct);
  
  // Host Fees (5% + VAT)
  const hostFee = round(base * i.serviceFeePct);
  const hostVat = i.stripeTaxEnabled ? 0 : round(hostFee * i.vatPct);
  
  const totalPlatformFee = round(serviceFee + vat + hostFee + hostVat);
  const total = round(base + serviceFee + vat);
  
  const guestLabel = i.guestsCount === 1 ? 'persona' : 'persone';
  // const labelPrice = i.pricePerDay && isDayRate ? i.pricePerDay : (i.pricePerHour || 0); // Unused
  // const labelUnit = isDayRate ? 'giorno' : 'ora'; // Unused

  return {
    base: round(base),
    serviceFee,
    hostFee,
    hostVat,
    totalPlatformFee,
    vat,
    total,
    isDayRate,
    breakdownLabel: isDayRate
      ? `Tariffa giornaliera × ${i.guestsCount} ${guestLabel}`
      : `${i.durationHours}h × ${i.guestsCount} ${guestLabel}`,
  };
}

serve(async (req) => {
  // Log request for debugging
  console.log(`[PAYMENT-SESSION] Request method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: combineHeaders() });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    
    // 1. Rate Limiting Check
    const supabaseTempClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: userData } = await supabaseTempClient.auth.getUser(token);
    const userId = userData?.user?.id;
    
    if (userId) {
      const { data: rateLimitCheck, error: rateLimitError } = await supabaseTempClient
        .rpc('check_rate_limit', {
          p_identifier: userId,
          p_action: 'create_payment_session'
        });
      
      if (!rateLimitError && rateLimitCheck && !rateLimitCheck.allowed) {
        console.warn('[RATE-LIMIT] User rate limited:', userId);
        return new Response(
          JSON.stringify({ 
            error: 'Troppe richieste. Riprova tra qualche istante.',
            rateLimitExceeded: true
          }),
          { status: 429, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
        );
      }
    }

    // 2. Main Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (!user?.email) throw new Error('User not authenticated');

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[PAYMENT-SESSION] Invalid JSON body:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON request body' }), {
        status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' })
      });
    }

    console.log('[PAYMENT-SESSION] Request body:', JSON.stringify(body));

    const { booking_id, fiscal_data } = body;

    if (!booking_id) {
      console.error('[PAYMENT-SESSION] Missing booking_id');
      return new Response(JSON.stringify({ error: 'Missing booking_id' }), {
        status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' })
      });
    }

    // 3. Fetch Booking with Timestamps
    console.log('[PAYMENT-SESSION] Fetching booking:', booking_id);
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, space_id, booking_date, start_time, end_time, guests_count')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('[PAYMENT-SESSION] Booking not found or error:', bookingError);
      return new Response(JSON.stringify({ error: 'Prenotazione non trovata' }), {
        status: 404, headers: combineHeaders({ 'Content-Type': 'application/json' })
      });
    }
    console.log('[PAYMENT-SESSION] Booking fetched:', JSON.stringify(booking));

    // Booking Status Validation
    if (['pending_approval', 'cancelled', 'rejected'].includes(booking.status)) {
        console.error('[PAYMENT-SESSION] Invalid booking status:', booking.status);
        return new Response(JSON.stringify({
            error: `Stato prenotazione non valido: ${booking.status}`
        }), { status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' }) });
    }

    // 4. Calculate Duration
    if (!booking.booking_date || !booking.start_time || !booking.end_time) {
        console.error('[PAYMENT-SESSION] Missing timing data for booking');
        return new Response(JSON.stringify({ error: 'Dati temporali prenotazione mancanti' }), {
            status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' })
        });
    }

    const startDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);

    if (endDateTime <= startDateTime) {
         console.error('[PAYMENT-SESSION] Invalid end time (before start)');
         return new Response(JSON.stringify({ error: 'Orario di fine non valido (precedente o uguale all\'inizio)' }), {
            status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' })
        });
    }

    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    console.log('[PAYMENT-SESSION] Calculated duration (hours):', durationHours);

    // 5. Fetch Workspace
    console.log('[PAYMENT-SESSION] Fetching workspace:', booking.space_id);
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, host_id, price_per_hour, price_per_day')
      .eq('id', booking.space_id)
      .single();

    if (workspaceError || !workspace) {
      console.error('[PAYMENT-SESSION] Workspace not found or error:', workspaceError);
      return new Response(JSON.stringify({ error: 'Spazio non trovato' }), {
        status: 404, headers: combineHeaders({ 'Content-Type': 'application/json' })
      });
    }
    console.log('[PAYMENT-SESSION] Workspace fetched:', JSON.stringify(workspace));

    // 6. Fetch Host Profile
    console.log('[PAYMENT-SESSION] Fetching host profile:', workspace.host_id);
    const { data: hostProfile, error: hostProfileError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, stripe_connected, fiscal_regime')
      .eq('id', workspace.host_id)
      .single();

    if (hostProfileError || !hostProfile) {
        console.error('[PAYMENT-SESSION] Host profile not found or error:', hostProfileError);
        return new Response(JSON.stringify({ error: 'Profilo host non trovato' }), {
            status: 404, headers: combineHeaders({ 'Content-Type': 'application/json' })
        });
    }
    console.log('[PAYMENT-SESSION] Host profile fetched (partial):', {
        id: hostProfile.id,
        stripe_connected: hostProfile.stripe_connected,
        has_account_id: !!hostProfile.stripe_account_id
    });

    if (!hostProfile.stripe_connected || !hostProfile.stripe_account_id) {
        console.error('[PAYMENT-SESSION] Host not connected to Stripe');
        return new Response(JSON.stringify({
            error: 'Host non configurato per ricevere pagamenti',
            action: 'contact_support'
        }), { status: 412, headers: combineHeaders({ 'Content-Type': 'application/json' }) });
    }

    // 7. Fiscal Validation
    let fiscalMetadata = {};
    if (fiscal_data && fiscal_data.request_invoice) {
       if (!fiscal_data.tax_id) {
         console.error('[PAYMENT-SESSION] Missing tax_id for invoice');
         return new Response(JSON.stringify({ error: 'Dati fiscali mancanti' }), {
             status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' })
         });
       }
       fiscalMetadata = {
        invoice_requested: 'true',
        invoice_tax_id: fiscal_data.tax_id,
        invoice_billing_address: fiscal_data.billing_address || ''
       };
    }

    // 8. Calculate Price
    const serviceFeePct = Number(Deno.env.get('SERVICE_FEE_PCT') ?? '0.05');
    const vatPct = Number(Deno.env.get('DEFAULT_VAT_PCT') ?? '0.22');
    const stripeTaxEnabled = Deno.env.get('ENABLE_STRIPE_TAX') === 'true';

    const pricing = computePricing({
        durationHours,
        pricePerHour: workspace.price_per_hour ? Number(workspace.price_per_hour) : null,
        pricePerDay: workspace.price_per_day ? Number(workspace.price_per_day) : null,
        guestsCount: booking.guests_count || 1,
        serviceFeePct,
        vatPct,
        stripeTaxEnabled
    });
    console.log('[PAYMENT-SESSION] Calculated pricing:', JSON.stringify(pricing));

    // 9. Create Stripe Session
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    // Ensure integers for Stripe
    const unitAmount = Math.round((stripeTaxEnabled ? pricing.base + pricing.serviceFee : pricing.total) * 100);
    const applicationFeeAmount = Math.round(pricing.totalPlatformFee * 100);

    console.log('[PAYMENT-SESSION] Stripe amounts (cents):', { unitAmount, applicationFeeAmount });

    const origin = req.headers.get('origin') ?? Deno.env.get('SITE_URL') ?? 'https://workover.example';

    const sessionPayload: any = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{
            price_data: {
                currency: 'eur',
                product_data: {
                    name: `Prenotazione: ${workspace.name}`,
                    description: pricing.breakdownLabel,
                },
                unit_amount: unitAmount,
                tax_behavior: stripeTaxEnabled ? 'exclusive' : 'inclusive',
            },
            quantity: 1,
        }],
        mode: 'payment',
        automatic_tax: { enabled: stripeTaxEnabled },
        payment_intent_data: {
            application_fee_amount: applicationFeeAmount,
            transfer_data: { destination: hostProfile.stripe_account_id },
            metadata: {
                booking_id: booking_id,
                space_id: booking.space_id,
                user_id: user.id,
                ...fiscalMetadata
            },
        },
        metadata: {
            booking_id: booking_id,
            space_id: booking.space_id,
            user_id: user.id,
            pricing_type: pricing.isDayRate ? 'day' : 'hour',
            duration_hours: String(durationHours),
            ...fiscalMetadata
        },
        success_url: `${origin}/bookings?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/bookings?cancelled=true`,
    };

    console.log('[PAYMENT-SESSION] Creating Stripe session with payload:', JSON.stringify(sessionPayload, null, 2));

    let session;
    try {
        session = await stripe.checkout.sessions.create(sessionPayload);
    } catch (stripeError: any) {
        console.error('[PAYMENT-SESSION] Stripe API Error:', stripeError);
        return new Response(JSON.stringify({
            error: 'Errore durante la creazione della sessione di pagamento Stripe',
            details: stripeError.message,
            code: stripeError.code
        }), {
            status: 400, // Or 500, but often Stripe errors are client validation errors (e.g. min amount)
            headers: combineHeaders({ 'Content-Type': 'application/json' })
        });
    }

    console.log('[PAYMENT-SESSION] Stripe session created:', session.id);

    // 10. Record Payment (Pending)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Duplicate Check
    const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id, payment_status, created_at')
        .eq('booking_id', booking_id)
        .in('payment_status', ['completed', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingPayment && existingPayment.payment_status === 'completed') {
        console.warn('[PAYMENT-SESSION] Payment already completed for booking:', booking_id);
        return new Response(JSON.stringify({ error: 'Pagamento già completato' }), {
            status: 409, headers: combineHeaders({ 'Content-Type': 'application/json' })
        });
    }

    // Insert Payment Record
    console.log('[PAYMENT-SESSION] Inserting payment record for session:', session.id);
    const { error: paymentInsertError } = await supabaseAdmin.from('payments').insert({
        booking_id: booking_id,
        user_id: user.id,
        amount: pricing.total,
        currency: 'EUR',
        payment_status: 'pending',
        stripe_session_id: session.id,
        host_amount: pricing.base - pricing.hostFee - pricing.hostVat,
        platform_fee: pricing.totalPlatformFee,
        method: 'stripe'
    });

    if (paymentInsertError) {
      console.error('[PAYMENT-SESSION] Failed to create initial payment record:', paymentInsertError);
      // Attempt to expire the session to avoid orphan payments
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireError) {
        console.error('[PAYMENT-SESSION] Failed to expire Stripe session after insert error:', expireError);
      }
      throw new Error('Failed to initialize payment record');
    }

    return new Response(JSON.stringify({ url: session.url }), {
        status: 200, headers: combineHeaders({ 'Content-Type': 'application/json' })
    });

  } catch (err: any) {
    console.error('[PAYMENT-SESSION] Unhandled error:', err);
    return new Response(JSON.stringify({
        error: String(err?.message ?? err),
        stack: err?.stack // Optional: include stack trace for debugging if safe
    }), {
      status: 500, headers: combineHeaders({ 'Content-Type': 'application/json' })
    });
  }
});
