// supabase/functions/create-payment-session/index.ts
// Deno Edge Function - Stripe Checkout (Connect) con pricing coerente UI/server

import Stripe from 'npm:stripe@14.25.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS base
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Util pricing (duplicata qui per evitare import client-side)
type PricingInput = {
  durationHours: number;
  pricePerHour: number;
  pricePerDay: number;
  serviceFeePct: number; // es. 0.12
  vatPct: number;        // es. 0.22
  stripeTaxEnabled?: boolean;
};
type PricingOutput = {
  base: number;
  serviceFee: number;
  vat: number;
  total: number;
  isDayRate: boolean;
  breakdownLabel: string;
};
const round = (n: number) => Math.round(n * 100) / 100;

function computePricing(i: PricingInput): PricingOutput {
  const isDayRate = i.durationHours >= 8;
  const base = isDayRate ? i.pricePerDay : i.durationHours * i.pricePerHour;
  const serviceFee = round(base * i.serviceFeePct);
  const vat = i.stripeTaxEnabled ? 0 : round((base + serviceFee) * i.vatPct);
  const total = round(base + serviceFee + vat);
  return {
    base: round(base),
    serviceFee,
    vat,
    total,
    isDayRate,
    breakdownLabel: isDayRate
      ? `Tariffa giornaliera (${i.durationHours}h)`
      : `${i.durationHours}h × €${i.pricePerHour}/h`,
  };
}

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Supabase client (user-scoped via token)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user?.email) throw new Error('User not authenticated or email missing');

    // Body
    const body = await req.json();
    const {
      space_id,
      durationHours,
      pricePerHour,
      pricePerDay,
      host_stripe_account_id,
      booking_id,
    } = body;

    // Required fields validation with detailed error response
    if (!space_id || !booking_id || !Number.isFinite(Number(durationHours)) ||
        !Number.isFinite(Number(pricePerHour)) || !Number.isFinite(Number(pricePerDay)) ||
        !host_stripe_account_id) {
      return new Response(JSON.stringify({
        error: 'Invalid or missing fields',
        missing: {
          space_id: !space_id,
          booking_id: !booking_id,
          durationHours: !(Number.isFinite(Number(durationHours)) && Number(durationHours) > 0),
          pricePerHour: !(Number.isFinite(Number(pricePerHour)) && Number(pricePerHour) >= 0),
          pricePerDay: !(Number.isFinite(Number(pricePerDay)) && Number(pricePerDay) >= 0),
          host_stripe_account_id: !host_stripe_account_id,
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Input validation for pricing values
    const numDurationHours = Number(durationHours);
    const numPricePerHour = Number(pricePerHour);
    const numPricePerDay = Number(pricePerDay);
    
    // Env lato server (NO VITE_* qui)
    const serviceFeePct = Number(Deno.env.get('SERVICE_FEE_PCT') ?? '0.12');
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Pricing server-side with validated inputs
    const pricing = computePricing({
      durationHours: numDurationHours,
      pricePerHour: numPricePerHour,
      pricePerDay: numPricePerDay,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        application_fee_amount: Math.round(pricing.serviceFee * 100),
        transfer_data: { destination: host_stripe_account_id },
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
        },
      },
      metadata: {
        booking_id: booking_id || '',
        space_id,
        user_id: user.id,
      },
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking-cancelled`,
    });

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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error('Payment session creation error:', err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});