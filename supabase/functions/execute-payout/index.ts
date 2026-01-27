import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16'
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[EXECUTE-PAYOUT] Starting payout execution...');

    const { data: bookings, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        space_id,
        spaces!inner(
          host_id,
          profiles!inner(stripe_account_id)
        ),
        payments:payments!fk_payments_booking_id!inner(host_amount, currency)
      `)
      .eq('status', 'served')
      .not('payout_scheduled_at', 'is', null)
      .is('payout_completed_at', null)
      .limit(50);

    if (fetchError) throw fetchError;

    if (!bookings || bookings.length === 0) {
      console.log('[EXECUTE-PAYOUT] No bookings to process');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No bookings to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[EXECUTE-PAYOUT] Processing ${bookings.length} bookings`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const booking of bookings) {
      try {
        const hostStripeId = booking.spaces.profiles.stripe_account_id;
        const hostAmount = booking.payments[0].host_amount;
        const currency = booking.payments[0].currency || 'EUR';

        if (!hostStripeId) {
          throw new Error(`Host Stripe account missing for booking ${booking.id}`);
        }

        const idempotencyKey = `payout_${booking.id}`;

        const transfer = await stripe.transfers.create(
          {
            amount: Math.round(hostAmount * 100),
            currency: currency.toLowerCase(),
            destination: hostStripeId,
            description: `Payout for booking ${booking.id}`,
            metadata: {
              booking_id: booking.id,
              space_id: booking.space_id,
            }
          },
          { idempotencyKey }
        );

        console.log(`[EXECUTE-PAYOUT] Transfer created: ${transfer.id} for booking ${booking.id}`);
        
        // Rate limiting: 100ms delay between Stripe API calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

        const { error: updateError } = await supabaseAdmin
          .from('bookings')
          .update({
            payout_completed_at: new Date().toISOString(),
            payout_stripe_transfer_id: transfer.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateError) throw updateError;

        await supabaseAdmin
          .from('user_notifications')
          .insert({
            user_id: booking.spaces.host_id,
            type: 'payout',
            title: 'Payout completato',
            content: `Il pagamento di €${hostAmount.toFixed(2)} per la prenotazione è stato trasferito al tuo conto Stripe.`,
            metadata: {
              booking_id: booking.id,
              amount: hostAmount,
              transfer_id: transfer.id
            }
          });

        results.success++;

      } catch (error: any) {
        console.error(`[EXECUTE-PAYOUT] Error processing booking ${booking.id}:`, error);
        results.failed++;
        results.errors.push({
          booking_id: booking.id,
          error: error.message
        });

        await supabaseAdmin
          .from('performance_metrics')
          .insert({
            metric_type: 'payout_error',
            metric_value: 1,
            metadata: {
              booking_id: booking.id,
              error: error.message,
              timestamp: new Date().toISOString()
            }
          });
      }
    }

    console.log(`[EXECUTE-PAYOUT] Completed: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        processed: bookings.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[EXECUTE-PAYOUT] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
