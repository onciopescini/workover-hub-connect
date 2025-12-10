// supabase/functions/create-payment-session/index.ts
// Deno Edge Function - Stripe Checkout (Connect) con pricing coerente UI/server

import Stripe from 'https://esm.sh/stripe@14.21.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { combineHeaders } from '../_shared/security-headers.ts';

// Util pricing (duplicata qui per evitare import client-side)
type PricingInput = {
  durationHours: number;
  pricePerHour: number;
  pricePerDay: number;
  guestsCount: number;
  serviceFeePct: number; // es. 0.12
  vatPct: number;        // es. 0.22
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
  const isDayRate = i.durationHours >= 8;
  const basePerPerson = isDayRate ? i.pricePerDay : i.durationHours * i.pricePerHour;
  const base = basePerPerson * i.guestsCount;
  const serviceFee = round(base * i.serviceFeePct);
  const vat = i.stripeTaxEnabled ? 0 : round(serviceFee * i.vatPct);
  
  // Calcola commissioni host (5% + IVA)
  const hostFee = round(base * i.serviceFeePct);
  const hostVat = i.stripeTaxEnabled ? 0 : round(hostFee * i.vatPct);
  
  // Totale piattaforma: buyer (serviceFee + vat) + host (hostFee + hostVat)
  const totalPlatformFee = round(serviceFee + vat + hostFee + hostVat);
  
  const total = round(base + serviceFee + vat);
  const guestLabel = i.guestsCount === 1 ? 'persona' : 'persone';
  
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
      ? `Tariffa giornaliera (${i.durationHours}h) × ${i.guestsCount} ${guestLabel}`
      : `${i.durationHours}h × €${i.pricePerHour}/h × ${i.guestsCount} ${guestLabel}`,
  };
}

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: combineHeaders() });
  }

  try {
    // ONDATA 2: FIX 2.9 - Rate Limiting
    // Check rate limit via RPC (5 payment sessions per minute per user)
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    
    // Create temporary supabase client for rate limit check
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
      
      if (rateLimitError) {
        console.warn('[RATE-LIMIT] Check failed, proceeding anyway:', rateLimitError.message);
      } else if (rateLimitCheck && !rateLimitCheck.allowed) {
        console.warn('[RATE-LIMIT] User rate limited:', userId);
        return new Response(
          JSON.stringify({ 
            error: 'Troppe richieste. Riprova tra qualche istante.',
            rateLimitExceeded: true
          }),
          { 
            status: 429, 
            headers: combineHeaders({ 'Content-Type': 'application/json' }) 
          }
        );
      }
    }
    // Supabase client (user-scoped via token)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Auth - reuse existing authHeader and token from rate limiting
    const { data: authData } = await supabase.auth.getUser(token);
    const user = authData?.user;
    if (!user?.email) throw new Error('User not authenticated or email missing');

    // Body
    const body = await req.json();
    const {
      space_id,
      durationHours,
      pricePerHour,
      pricePerDay,
      guestsCount,
      host_stripe_account_id,
      booking_id,
      fiscal_data,
    } = body;

    // Required fields validation with detailed error response
    if (!space_id || !booking_id || !Number.isFinite(Number(durationHours)) ||
        !Number.isFinite(Number(pricePerHour)) || !Number.isFinite(Number(pricePerDay)) ||
        !Number.isFinite(Number(guestsCount)) || Number(guestsCount) < 1 ||
        !host_stripe_account_id) {
      return new Response(JSON.stringify({
        error: 'Invalid or missing fields',
        missing: {
          space_id: !space_id,
          booking_id: !booking_id,
          durationHours: !(Number.isFinite(Number(durationHours)) && Number(durationHours) > 0),
          pricePerHour: !(Number.isFinite(Number(pricePerHour)) && Number(pricePerHour) >= 0),
          pricePerDay: !(Number.isFinite(Number(pricePerDay)) && Number(pricePerDay) >= 0),
          guestsCount: !(Number.isFinite(Number(guestsCount)) && Number(guestsCount) >= 1),
          host_stripe_account_id: !host_stripe_account_id,
        }
      }), { headers: combineHeaders({ 'Content-Type': 'application/json' }), status: 400 });
    }

    // FASE 1.2: Fiscal Data Pre-Payment Validation
    let fiscalMetadata = {};
    if (fiscal_data && fiscal_data.request_invoice) {
      console.log('[FISCAL-DATA] Processing invoice request:', {
        tax_id: fiscal_data.tax_id ? '***' : 'none',
        is_business: fiscal_data.is_business,
      });
      
      // Validate required fields
      const requiredFields = {
        tax_id: 'Codice Fiscale / Partita IVA',
        billing_address: 'Indirizzo',
        billing_city: 'Città',
        billing_postal_code: 'CAP'
      };
      
      const missing = Object.entries(requiredFields)
        .filter(([key]) => !fiscal_data[key] || fiscal_data[key].trim().length === 0)
        .map(([_, label]) => label);
      
      if (missing.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Dati fiscali incompleti per emissione fattura',
            missing_fields: missing,
            help: 'Completa tutti i campi obbligatori nella sezione "Dati per Fatturazione"'
          }),
          { status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
        );
      }
      
      // Validate CF/PIVA format
      const taxId = fiscal_data.tax_id.trim().toUpperCase();
      const isCF = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(taxId);
      const isPIVA = /^[0-9]{11}$/.test(taxId);
      
      if (!isCF && !isPIVA) {
        return new Response(
          JSON.stringify({ 
            error: 'Codice Fiscale o Partita IVA non valida',
            provided_format: taxId.length + ' caratteri',
            expected: 'Codice Fiscale (16 caratteri) o Partita IVA (11 cifre)'
          }),
          { status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
        );
      }
      
      // Verify host fiscal_regime
      // Refactor: use workspaces table and decoupled profile fetch
      const { data: workspaceData, error: wsError } = await supabase
        .from('workspaces')
        .select('host_id')
        .eq('id', space_id)
        .single();

      if (wsError || !workspaceData) {
        console.error('[FISCAL-DATA] Workspace not found:', wsError);
        return new Response(
          JSON.stringify({ error: 'Space not found' }),
          { status: 404, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
        );
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('fiscal_regime')
        .eq('id', workspaceData.host_id)
        .single();
      
      if (profileError || !profileData?.fiscal_regime) {
        return new Response(
          JSON.stringify({ 
            error: 'Host non ha configurato il regime fiscale',
            action: 'contact_support',
            help: 'L\'host deve completare i dati fiscali'
          }),
          { status: 412, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
        );
      }
      
      fiscalMetadata = {
        invoice_requested: 'true',
        invoice_tax_id: fiscal_data.tax_id || '',
        invoice_is_business: String(fiscal_data.is_business || false),
        invoice_pec_email: fiscal_data.pec_email || '',
        invoice_sdi_code: fiscal_data.sdi_code || '',
        invoice_billing_address: fiscal_data.billing_address || '',
        invoice_billing_city: fiscal_data.billing_city || '',
        invoice_billing_province: fiscal_data.billing_province || '',
        invoice_billing_postal_code: fiscal_data.billing_postal_code || '',
      };
    }

    // Input validation for pricing values
    const numDurationHours = Number(durationHours);
    const numPricePerHour = Number(pricePerHour);
    const numPricePerDay = Number(pricePerDay);
    
    // Env lato server (NO VITE_* qui)
    const serviceFeePct = Number(Deno.env.get('SERVICE_FEE_PCT') ?? '0.05');
    const vatPct = Number(Deno.env.get('DEFAULT_VAT_PCT') ?? '0.22');
    const stripeTaxEnabled = Deno.env.get('ENABLE_STRIPE_TAX') === 'true';
    
    // Comprehensive input validation - return 400 for any invalid inputs
    if (
      !Number.isFinite(numDurationHours) || numDurationHours <= 0 ||
      !Number.isFinite(numPricePerHour) || numPricePerHour < 0 ||
      !Number.isFinite(numPricePerDay) || numPricePerDay < 0 ||
      !Number.isFinite(serviceFeePct) || serviceFeePct < 0 || serviceFeePct > 1 ||
      !Number.isFinite(vatPct) || vatPct < 0 || vatPct > 1
    ) {
      return new Response(JSON.stringify({ error: 'Invalid pricing input' }), {
        headers: combineHeaders({ 'Content-Type': 'application/json' }),
        status: 400,
      });
    }

    // Validazione booking - blocca pagamento se in pending_approval
    console.log('[PAYMENT-SESSION] Validating booking status...');

    // Step 1: Fetch booking only
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, space_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('[PAYMENT-SESSION] Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Prenotazione non trovata' }),
        { status: 404, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    // Step 2: Fetch workspace details (using workspaces table)
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, confirmation_type')
      .eq('id', booking.space_id)
      .single();

    if (workspaceError || !workspace) {
      console.error('[PAYMENT-SESSION] Workspace not found:', workspaceError);
      return new Response(
        JSON.stringify({ error: 'Space not found associated with booking' }),
        { status: 404, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    // CRITICAL: Blocca pagamento se la prenotazione è in attesa di approvazione host
    if (booking.status === 'pending_approval') {
      console.log(`[PAYMENT-BLOCKED] Booking ${booking_id} is pending_approval, payment not allowed yet`);
      return new Response(
        JSON.stringify({ 
          error: 'Questa prenotazione è in attesa di approvazione dall\'host. Non puoi ancora pagare.',
          status: booking.status,
          space_title: workspace.name
        }),
        { status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    // Permetti pagamento solo per pending o pending_payment
    if (booking.status !== 'pending' && booking.status !== 'pending_payment') {
      console.log(`[PAYMENT-BLOCKED] Booking ${booking_id} has status ${booking.status}, payment not allowed`);
      return new Response(
        JSON.stringify({ 
          error: 'Questa prenotazione non è in uno stato valido per il pagamento.',
          status: booking.status
        }),
        { status: 400, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
      );
    }

    console.log('[PAYMENT-SESSION] Booking status validated:', booking.status);

    // Pricing server-side with validated inputs
    const pricing = computePricing({
      durationHours: numDurationHours,
      pricePerHour: numPricePerHour,
      pricePerDay: numPricePerDay,
      guestsCount: Number(guestsCount),
      serviceFeePct,
      vatPct,
      stripeTaxEnabled,
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Customer (riutilizza se esiste)
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    // unit_amount in centesimi - clamp to 2 decimals before conversion
    const baseAmount = stripeTaxEnabled ? pricing.base + pricing.serviceFee : pricing.total;
    const clampedAmount = Math.round(baseAmount * 100) / 100; // Ensure 2 decimal places
    const unitAmount = Math.round(clampedAmount * 100);
    
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      console.warn('Invalid unit amount calculated:', { baseAmount, clampedAmount, unitAmount, pricing });
      return new Response(JSON.stringify({ error: 'Invalid amount calculated' }), {
        headers: combineHeaders({ 'Content-Type': 'application/json' }),
        status: 400,
      });
    }

    // Origin fallback sicuro
    const origin =
      req.headers.get('origin') ??
      Deno.env.get('SITE_URL') ??
      'https://workover.example';

    // Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      customer_update: customerId ? { address: 'auto' } : undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'WorkOver - Prenotazione spazio',
              description: pricing.breakdownLabel,
            },
            unit_amount: unitAmount,
            tax_behavior: stripeTaxEnabled ? 'exclusive' : 'inclusive',
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      automatic_tax: { enabled: stripeTaxEnabled },
      payment_intent_data: {
        application_fee_amount: Math.round(pricing.totalPlatformFee * 100),
        transfer_data: { destination: host_stripe_account_id },
        metadata: {
          booking_id: booking_id || '',
          space_id,
          user_id: user.id,
          duration_hours: String(durationHours),
          base_amount: String(pricing.base),
          buyer_service_fee: String(pricing.serviceFee),
          buyer_vat: String(pricing.vat),
          host_service_fee: String(pricing.hostFee),
          host_vat: String(pricing.hostVat),
          total_platform_fee: String(pricing.totalPlatformFee),
          host_net_payout: String(pricing.base - pricing.hostFee - pricing.hostVat),
          total_amount: String(pricing.total),
          pricing_type: pricing.isDayRate ? 'day' : 'hour',
          ...fiscalMetadata,
        },
      },
      metadata: {
        booking_id: booking_id || '',
        space_id,
        user_id: user.id,
        duration_hours: String(durationHours),
        base_amount: String(pricing.base),
        service_fee: String(pricing.serviceFee),
        vat_amount: String(pricing.vat),
        total_amount: String(pricing.total),
        pricing_type: pricing.isDayRate ? 'day' : 'hour',
        ...fiscalMetadata,
      },
      success_url: `${origin}/bookings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bookings?cancelled=true`,
    });

    // FASE 1.1: Check for existing payments (anti-duplicate)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id, payment_status, created_at')
      .eq('booking_id', booking_id)
      .in('payment_status', ['completed', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPayment) {
      if (existingPayment.payment_status === 'completed') {
        return new Response(
          JSON.stringify({ 
            error: 'Pagamento già completato per questa prenotazione',
            payment_id: existingPayment.id
          }),
          { status: 409, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
        );
      }
      
      // If pending, check age (max 2h)
      const paymentAgeMs = Date.now() - new Date(existingPayment.created_at).getTime();
      if (paymentAgeMs < 2 * 60 * 60 * 1000) {
        return new Response(
          JSON.stringify({ 
            error: 'Esiste già un pagamento in elaborazione',
            payment_id: existingPayment.id,
            retry_after_seconds: Math.ceil((7200000 - paymentAgeMs) / 1000)
          }),
          { status: 429, headers: combineHeaders({ 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((7200000 - paymentAgeMs) / 1000))
          }) }
        );
      }
    }

    // Create initial payment record
    console.log('[PAYMENT-SESSION] Creating initial payment record...');

    const { error: paymentInsertError } = await supabaseAdmin
      .from('payments')
      .insert({
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
      // Cancella la Stripe session creata per evitare inconsistenze
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireError) {
        console.error('[PAYMENT-SESSION] Failed to expire Stripe session:', expireError);
      }
      throw new Error('Failed to initialize payment record');
    }

    console.log('[PAYMENT-SESSION] Initial payment record created successfully');

    return new Response(
      JSON.stringify({
        url: session.url,
        serverTotals: {
          base: pricing.base,
          serviceFee: pricing.serviceFee,
          vat: pricing.vat,
          total: pricing.total,
          stripeTaxEnabled,
          unitAmount: unitAmount / 100,
        },
      }),
      { headers: combineHeaders({ 'Content-Type': 'application/json' }), status: 200 }
    );
  } catch (err: any) {
    console.error('Payment session creation error:', err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      headers: combineHeaders({ 'Content-Type': 'application/json' }),
      status: 500,
    });
  }
});