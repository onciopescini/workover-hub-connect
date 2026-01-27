import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from retry-failed-invoices!");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[retry-failed-invoices] Starting batch retry...');

    // Find payments without invoices (completed status within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: payments, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        booking_id,
        platform_fee,
        amount,
        payment_status
      `)
      .in('payment_status', ['completed', 'succeeded', 'paid'])
      .gt('created_at', thirtyDaysAgo)
      .limit(50);

    if (fetchError) {
      console.error('[retry-failed-invoices] Fetch payments error:', fetchError);
      throw fetchError;
    }

    if (!payments || payments.length === 0) {
      console.log('[retry-failed-invoices] No recent payments found');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          succeeded: 0,
          failed: 0,
          message: 'No payments to process'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment IDs to check for existing invoices
    const paymentIds = payments.map(p => p.id);

    // Check which payments already have invoices
    const { data: existingInvoices, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('payment_id')
      .in('payment_id', paymentIds);

    if (invoiceError) {
      console.error('[retry-failed-invoices] Fetch invoices error:', invoiceError);
      throw invoiceError;
    }

    const invoicedPaymentIds = new Set(existingInvoices?.map(i => i.payment_id) || []);
    const missingInvoices = payments.filter(p => !invoicedPaymentIds.has(p.id));

    console.log(`[retry-failed-invoices] Found ${missingInvoices.length} payments without invoices out of ${payments.length} total`);

    if (missingInvoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          succeeded: 0,
          failed: 0,
          message: 'All payments have invoices'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ payment_id: string; error: string }> = [];

    for (const payment of missingInvoices) {
      try {
        // Get booking and space info
        const { data: booking, error: bookingError } = await supabaseAdmin
          .from('bookings')
          .select(`
            id,
            space_id,
            spaces!inner(
              host_id
            )
          `)
          .eq('id', payment.booking_id)
          .single();

        if (bookingError || !booking) {
          console.log(`[retry-failed-invoices] Booking not found for payment ${payment.id}`);
          failCount++;
          errors.push({ payment_id: payment.id, error: 'Booking not found' });
          continue;
        }

        const hostId = (booking as any).spaces?.host_id;
        if (!hostId) {
          console.log(`[retry-failed-invoices] No host_id for payment ${payment.id}, skipping`);
          failCount++;
          errors.push({ payment_id: payment.id, error: 'No host_id found' });
          continue;
        }

        // Calculate fees
        const platformFee = Number(payment.platform_fee || 0);
        const hostFee = platformFee / 2; // Split platform fee
        const hostVat = hostFee * 0.22; // Default VAT rate

        console.log(`[retry-failed-invoices] Invoking generate-host-invoice for payment ${payment.id}`);

        const { error: invokeError } = await supabaseAdmin.functions.invoke('generate-host-invoice', {
          body: {
            payment_id: payment.id,
            booking_id: payment.booking_id,
            host_id: hostId,
            breakdown: {
              host_fee: hostFee,
              host_vat: hostVat,
              total: hostFee + hostVat
            }
          }
        });

        if (invokeError) {
          console.error(`[retry-failed-invoices] Failed for payment ${payment.id}:`, invokeError);
          failCount++;
          errors.push({ payment_id: payment.id, error: invokeError.message });
        } else {
          console.log(`[retry-failed-invoices] Success for payment ${payment.id}`);
          successCount++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (e: any) {
        console.error(`[retry-failed-invoices] Exception for payment ${payment.id}:`, e);
        failCount++;
        errors.push({ payment_id: payment.id, error: e.message });
      }
    }

    // Log summary
    console.log(`[retry-failed-invoices] Complete: ${successCount} succeeded, ${failCount} failed`);

    // Log to application_logs
    await supabaseAdmin
      .from('application_logs')
      .insert({
        log_level: failCount > 0 ? 'WARN' : 'INFO',
        component: 'retry-failed-invoices',
        message: `Invoice retry batch complete: ${successCount}/${missingInvoices.length} succeeded`,
        context: {
          total_checked: payments.length,
          missing_invoices: missingInvoices.length,
          succeeded: successCount,
          failed: failCount,
          errors: errors.slice(0, 10) // Limit error details
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        processed: missingInvoices.length,
        succeeded: successCount,
        failed: failCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[retry-failed-invoices] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
