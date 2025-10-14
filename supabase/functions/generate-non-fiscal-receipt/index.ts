import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { booking_id } = await req.json();

    console.log('[NON-FISCAL-RECEIPT] Processing booking:', booking_id);

    // Fetch booking with space and host details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        user_id,
        status,
        spaces:space_id (
          id,
          title,
          host_id,
          profiles:host_id (
            id,
            first_name,
            last_name,
            email,
            fiscal_regime
          )
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    const host = booking.spaces.profiles;

    // Check if host is private (no P.IVA)
    if (host.fiscal_regime !== 'privato') {
      console.log('[NON-FISCAL-RECEIPT] Host has P.IVA, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Host has P.IVA - fiscal invoice required instead' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if booking is served
    if (booking.status !== 'served') {
      throw new Error('Booking must be in served status');
    }

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('payment_status', 'completed')
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    // Check if receipt already exists
    const { data: existingReceipt } = await supabaseClient
      .from('non_fiscal_receipts')
      .select('id')
      .eq('booking_id', booking_id)
      .single();

    if (existingReceipt) {
      console.log('[NON-FISCAL-RECEIPT] Receipt already exists');
      return new Response(
        JSON.stringify({ success: true, message: 'Receipt already generated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch coworker details
    const { data: coworker, error: coworkerError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', booking.user_id)
      .single();

    if (coworkerError || !coworker) {
      throw new Error(`Coworker not found: ${coworkerError?.message}`);
    }

    // Generate unique receipt number (host-based sequence)
    const { count } = await supabaseClient
      .from('non_fiscal_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', host.id);

    const receiptNumber = `RIC-${host.id.substring(0, 8)}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Generate PDF receipt content
    const pdfContent = generateReceiptPDF({
      booking,
      payment,
      host,
      coworker,
      space: booking.spaces,
      receiptNumber
    });

    // Upload PDF to storage
    const fileName = `${host.id}/${coworker.id}/${booking_id}_receipt.pdf`;
    const { error: uploadError } = await supabaseClient.storage
      .from('non-fiscal-receipts')
      .upload(fileName, new Blob([pdfContent], { type: 'application/pdf' }), {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('non-fiscal-receipts')
      .getPublicUrl(fileName);

    // Insert receipt record
    const { data: receipt, error: insertError } = await supabaseClient
      .from('non_fiscal_receipts')
      .insert({
        booking_id: booking.id,
        payment_id: payment.id,
        host_id: host.id,
        coworker_id: coworker.id,
        receipt_number: receiptNumber,
        receipt_date: new Date().toISOString().split('T')[0],
        canone_amount: payment.host_amount,
        discount_amount: 0,
        total_amount: payment.host_amount,
        includes_coworker_cf: false,
        pdf_url: publicUrl
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert receipt: ${insertError.message}`);
    }

    // Create notifications for both host and coworker
    const notifications = [
      {
        user_id: host.id,
        type: 'receipt_generated',
        title: 'Ricevuta generata',
        content: `Ricevuta non fiscale generata per la prenotazione del ${new Date(booking.booking_date).toLocaleDateString('it-IT')}.`,
        metadata: {
          booking_id: booking.id,
          receipt_id: receipt.id,
          receipt_number: receiptNumber,
          pdf_url: publicUrl
        }
      },
      {
        user_id: coworker.id,
        type: 'receipt_available',
        title: 'Ricevuta disponibile',
        content: `La ricevuta per la prenotazione del ${new Date(booking.booking_date).toLocaleDateString('it-IT')} è disponibile per il download.`,
        metadata: {
          booking_id: booking.id,
          receipt_id: receipt.id,
          receipt_number: receiptNumber,
          pdf_url: publicUrl
        }
      }
    ];

    const { error: notifError } = await supabaseClient
      .from('user_notifications')
      .insert(notifications);

    if (notifError) {
      console.error('[NON-FISCAL-RECEIPT] Notification error:', notifError);
    }

    console.log('[NON-FISCAL-RECEIPT] Success:', {
      booking_id,
      receipt_id: receipt.id,
      receipt_number: receiptNumber
    });

    return new Response(
      JSON.stringify({
        success: true,
        receipt_id: receipt.id,
        receipt_number: receiptNumber,
        pdf_url: publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[NON-FISCAL-RECEIPT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateReceiptPDF(data: any): string {
  const { booking, payment, host, coworker, space, receiptNumber } = data;
  
  return `
=================================================
RICEVUTA NON FISCALE
=================================================

Numero Ricevuta: ${receiptNumber}
Data Emissione: ${new Date().toLocaleDateString('it-IT')}

EMITTENTE:
${host.first_name} ${host.last_name}
Email: ${host.email}

DESTINATARIO:
${coworker.first_name} ${coworker.last_name}
Email: ${coworker.email}

DETTAGLI PRENOTAZIONE:
Spazio: ${space.title}
Data: ${new Date(booking.booking_date).toLocaleDateString('it-IT')}
Orario: ${booking.start_time} - ${booking.end_time}
Booking ID: ${booking.id}

IMPORTO:
Canone locazione: €${payment.host_amount.toFixed(2)}
Sconto applicato: €0.00
---------------------------------
TOTALE: €${payment.host_amount.toFixed(2)}

MODALITÀ PAGAMENTO: Pagamento anticipato tramite piattaforma WorkOver

=================================================
DISCLAIMER LEGALE
=================================================
Documento non valido ai fini fiscali, emesso 
esclusivamente per tracciabilità della transazione.
Non costituisce fattura né documento fiscalmente 
rilevante ai sensi del DPR 633/72.
=================================================

WorkOver Platform - workover.app
Generato automaticamente il ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT')}
  `.trim();
}
