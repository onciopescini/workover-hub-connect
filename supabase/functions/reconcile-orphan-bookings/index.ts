// FASE 2: Script di riconciliazione bookings orfane (one-time execution)
// Trova bookings in pending senza payment record e le riconcilia con Stripe API

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RECONCILE] Starting orphan bookings reconciliation...');

    // Verifica che sia un admin a chiamare questo endpoint
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    const { data: userData } = await supabaseClient.auth.getUser();
    const user = userData?.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Verifica che l'utente sia admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    console.log('[RECONCILE] Admin access verified');

    // Usa service role per operazioni admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // STEP 1: Trova tutte le bookings orfane (pending senza payment record)
    const { data: orphanBookings, error: queryError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        user_id,
        space_id,
        booking_date,
        payment_session_id,
        status,
        created_at,
        spaces (
          id,
          title,
          price_per_day,
          host_id
        )
      `)
      .eq('status', 'pending')
      .not('payment_session_id', 'is', null);

    if (queryError) {
      throw new Error(`Failed to query bookings: ${queryError.message}`);
    }

    console.log(`[RECONCILE] Found ${orphanBookings?.length || 0} pending bookings with payment_session_id`);

    // Filtra solo quelle senza payment record
    const bookingsToReconcile = [];
    for (const booking of orphanBookings || []) {
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('booking_id', booking.id)
        .maybeSingle();

      if (!existingPayment) {
        bookingsToReconcile.push(booking);
      }
    }

    console.log(`[RECONCILE] Found ${bookingsToReconcile.length} orphan bookings (without payment record)`);

    const results = {
      total: bookingsToReconcile.length,
      confirmed: 0,
      cancelled: 0,
      errors: 0,
      details: [] as any[]
    };

    // STEP 2: Per ogni booking, controlla Stripe e riconcilia
    for (const booking of bookingsToReconcile) {
      try {
        console.log(`[RECONCILE] Processing booking ${booking.id}...`);

        // Recupera la session da Stripe
        const session = await stripe.checkout.sessions.retrieve(booking.payment_session_id);

        if (session.payment_status === 'paid' && session.status === 'complete') {
          // Pagamento completato → crea payment e conferma booking
          console.log(`[RECONCILE] Payment completed for booking ${booking.id}, creating payment record...`);

          const { error: insertError } = await supabaseAdmin
            .from('payments')
            .insert({
              booking_id: booking.id,
              user_id: booking.user_id,
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || 'eur').toUpperCase(),
              payment_status: 'completed',
              stripe_session_id: booking.payment_session_id,
              receipt_url: session.receipt_url || null,
              method: 'stripe',
              host_amount: booking.spaces.price_per_day * 0.9, // Approx host amount
              platform_fee: booking.spaces.price_per_day * 0.1  // Approx platform fee
            });

          if (insertError) {
            throw new Error(`Failed to insert payment: ${insertError.message}`);
          }

          // Conferma booking
          const { error: bookingError } = await supabaseAdmin
            .from('bookings')
            .update({
              status: 'confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);

          if (bookingError) {
            throw new Error(`Failed to confirm booking: ${bookingError.message}`);
          }

          results.confirmed++;
          results.details.push({
            booking_id: booking.id,
            action: 'confirmed',
            stripe_session_id: booking.payment_session_id
          });

          console.log(`[RECONCILE] ✅ Booking ${booking.id} confirmed successfully`);

        } else if (session.status === 'expired') {
          // Session scaduta → cancella booking
          console.log(`[RECONCILE] Session expired for booking ${booking.id}, cancelling...`);

          const { error: cancelError } = await supabaseAdmin
            .from('bookings')
            .update({
              status: 'cancelled',
              cancellation_reason: 'Payment session expired (auto-reconciliation)',
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);

          if (cancelError) {
            throw new Error(`Failed to cancel booking: ${cancelError.message}`);
          }

          results.cancelled++;
          results.details.push({
            booking_id: booking.id,
            action: 'cancelled',
            reason: 'session_expired',
            stripe_session_id: booking.payment_session_id
          });

          console.log(`[RECONCILE] ❌ Booking ${booking.id} cancelled (expired session)`);

        } else {
          // Session in altro stato (unpaid, open) → crea payment pending
          console.log(`[RECONCILE] Session status ${session.status} for booking ${booking.id}, creating pending payment...`);

          const { error: insertError } = await supabaseAdmin
            .from('payments')
            .insert({
              booking_id: booking.id,
              user_id: booking.user_id,
              amount: (session.amount_total || 0) / 100,
              currency: (session.currency || 'eur').toUpperCase(),
              payment_status: 'pending',
              stripe_session_id: booking.payment_session_id,
              method: 'stripe'
            });

          if (insertError) {
            throw new Error(`Failed to insert pending payment: ${insertError.message}`);
          }

          results.details.push({
            booking_id: booking.id,
            action: 'pending_payment_created',
            stripe_status: session.status,
            stripe_session_id: booking.payment_session_id
          });

          console.log(`[RECONCILE] 🔄 Pending payment created for booking ${booking.id}`);
        }

      } catch (error: any) {
        // Se session non trovata su Stripe → cancella booking
        if (error.code === 'resource_missing') {
          console.log(`[RECONCILE] Session not found in Stripe for booking ${booking.id}, cancelling...`);

          const { error: cancelError } = await supabaseAdmin
            .from('bookings')
            .update({
              status: 'cancelled',
              cancellation_reason: 'Payment session not found in Stripe (auto-reconciliation)',
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id);

          if (cancelError) {
            console.error(`[RECONCILE] Failed to cancel booking ${booking.id}:`, cancelError);
            results.errors++;
          } else {
            results.cancelled++;
          }

          results.details.push({
            booking_id: booking.id,
            action: 'cancelled',
            reason: 'session_not_found',
            stripe_session_id: booking.payment_session_id
          });

        } else {
          // Altro errore
          console.error(`[RECONCILE] Error processing booking ${booking.id}:`, error);
          results.errors++;
          results.details.push({
            booking_id: booking.id,
            action: 'error',
            error: error.message,
            stripe_session_id: booking.payment_session_id
          });
        }
      }
    }

    console.log('[RECONCILE] Reconciliation completed:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Orphan bookings reconciliation completed',
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[RECONCILE] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
