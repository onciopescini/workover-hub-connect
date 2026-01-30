
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { ErrorHandler } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ErrorHandler.logInfo('Validate payment function started');

    // Verifica delle variabili d'ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      ErrorHandler.logError('STRIPE_SECRET_KEY not found', null, { operation: 'env_validation' });
      throw new Error('Stripe configuration missing');
    }

    if (!supabaseUrl || !serviceRoleKey) {
      ErrorHandler.logError('Supabase configuration missing', null, { operation: 'env_validation' });
      throw new Error('Supabase configuration missing');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Parse request body
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Missing session_id parameter');
    }

    ErrorHandler.logInfo('Validating payment session', { session_id });

    // Recupera la sessione da Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session) {
      throw new Error('Session not found');
    }

    ErrorHandler.logInfo('Session retrieved', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status
    });

    // CRITICAL: Determine confirmation type for branching logic FIRST
    const confirmationType = session.metadata?.confirmation_type;
    const isRequestToBook = confirmationType === 'host_approval';
    
    // CRITICAL FIX: For Request to Book (manual capture), Stripe returns payment_status='unpaid'
    // because funds are authorized but NOT captured yet. Session status is still 'complete'.
    // For Instant Book: payment_status='paid' (captured), status='complete'
    const isInstantBookSuccess = session.payment_status === 'paid' && session.status === 'complete';
    const isRequestToBookSuccess = session.payment_status === 'unpaid' && session.status === 'complete' && isRequestToBook;
    const isPaymentSuccessful = isInstantBookSuccess || isRequestToBookSuccess;
    
    ErrorHandler.logInfo('Payment flow type determined', {
      session_id,
      confirmationType: confirmationType || 'unknown (legacy session)',
      isRequestToBook
    });
    
    if (isPaymentSuccessful && session.metadata?.booking_id) {
      // Calculate amounts from metadata (with fallback for legacy sessions)
      const totalAmount = (session.amount_total || 0) / 100;
      let hostAmount = 0;
      let platformFee = 0;
      
      if (session.metadata.host_net_payout && session.metadata.total_platform_fee) {
        // New sessions with proper metadata
        hostAmount = parseFloat(session.metadata.host_net_payout);
        platformFee = parseFloat(session.metadata.total_platform_fee);
      } else {
        // Legacy fallback: reverse-engineer from total
        // totalGuestPay = basePrice * 1.061 (5% fee + 1.1% VAT on fee)
        const basePrice = totalAmount / 1.061;
        hostAmount = basePrice * 0.95; // Host gets base - 5%
        platformFee = totalAmount - hostAmount;
        ErrorHandler.logWarning('Using fallback pricing calculation', { totalAmount, basePrice, hostAmount, platformFee });
      }

      // FASE 4: Verifica esistenza payment e crea se necessario (fallback critico)
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id, payment_status')
        .eq('stripe_session_id', session_id)
        .maybeSingle();

      if (!existingPayment) {
        // Payment record non trovato → CREA (fallback critico)
        ErrorHandler.logWarning('Payment record not found, creating now (critical fallback)', { session_id });
        
        // CRITICAL FIX: Set correct payment status based on confirmation type
        const correctPaymentStatus = isRequestToBook ? 'pending' : 'completed';
        const correctPaymentStatusEnum = isRequestToBook ? 'pending' : 'succeeded';
        
        const { error: insertError } = await supabaseAdmin
          .from('payments')
          .insert({
            booking_id: session.metadata.booking_id,
            user_id: session.metadata.user_id,
            amount: totalAmount,
            currency: (session.currency || 'eur').toUpperCase(),
            payment_status: correctPaymentStatus,
            payment_status_enum: correctPaymentStatusEnum,
            stripe_session_id: session_id,
            receipt_url: session.receipt_url,
            host_amount: hostAmount,
            platform_fee: platformFee,
            method: 'stripe'
          });

        if (insertError) {
          ErrorHandler.logError('CRITICAL: Failed to create payment in validate-payment', insertError, {
            operation: 'insert_payment',
            session_id
          });
          throw new Error('Failed to create payment record');
        }
        
        ErrorHandler.logSuccess('Payment record created in validate-payment (fallback)');
      } else {
        // Payment esiste → UPDATE with correct status based on confirmation type
        const correctPaymentStatus = isRequestToBook ? 'pending' : 'completed';
        const correctPaymentStatusEnum = isRequestToBook ? 'pending' : 'succeeded';
        
        const { error: updateError } = await supabaseAdmin
          .from('payments')
          .update({
            payment_status: correctPaymentStatus,
            payment_status_enum: correctPaymentStatusEnum,
            receipt_url: session.receipt_url
          })
          .eq('id', existingPayment.id);

        if (updateError) {
          ErrorHandler.logError('Error updating payment', updateError, {
            operation: 'update_payment',
            session_id
          });
          throw new Error('Failed to update payment status');
        }
        
        ErrorHandler.logSuccess('Payment updated successfully', {
          paymentStatus: correctPaymentStatus,
          isRequestToBook
        });
      }

      // STEP 2: Update booking status based on confirmation type
      // CRITICAL: Request to Book stays as 'pending_approval', Instant Book becomes 'confirmed'
      // NOTE: Payment status is now set correctly upfront (lines 117-119 or 142-144)
      if (isRequestToBook) {
        // Request to Book: Payment authorized but NOT captured
        // Booking stays as 'pending_approval' - payment already set to 'pending' above
        ErrorHandler.logSuccess('Request to Book - payment pending, booking pending_approval', {
          booking_id: session.metadata.booking_id,
          payment_status: 'pending'
        });
      } else {
        // Instant Book: Payment captured, confirm booking
        const { error: bookingError } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.metadata.booking_id);

        if (bookingError) {
          ErrorHandler.logError('Error updating booking', bookingError, {
            operation: 'update_booking',
            booking_id: session.metadata.booking_id
          });
          throw new Error('Failed to confirm booking');
        }
        
        ErrorHandler.logSuccess('Instant Book - booking confirmed successfully');
      }
    }

    // Determine the final booking status to return to frontend
    const finalBookingStatus = isRequestToBook ? 'pending_approval' : 'confirmed';

    return new Response(JSON.stringify({
      success: isPaymentSuccessful,
      payment_status: session.payment_status,
      session_status: session.status,
      booking_id: session.metadata?.booking_id,
      booking_status: finalBookingStatus,
      confirmation_type: confirmationType || 'instant'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error in validate-payment function', error, {
      operation: 'validate_payment',
      error_message: error.message
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
