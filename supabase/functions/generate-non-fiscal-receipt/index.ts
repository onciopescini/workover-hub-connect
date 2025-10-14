import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { booking_id } = await req.json();
    console.log('[NON-FISCAL-RECEIPT] Processing booking:', booking_id);

    // 1. Fetch booking + space + host
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        spaces(
          title,
          host_id,
          profiles!spaces_host_id_fkey(
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

    // Only process served bookings
    if (booking.status !== 'served') {
      return new Response(
        JSON.stringify({ error: 'Booking not served yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const host = (booking as any).spaces.profiles;
    
    // Only generate for private hosts (no P.IVA)
    if (host.fiscal_regime !== 'privato' && host.fiscal_regime !== null) {
      console.log('[NON-FISCAL-RECEIPT] Host has P.IVA, skipping');
      return new Response(
        JSON.stringify({ message: 'Host has P.IVA, invoice required instead' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Fetch payment
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('payment_status', 'completed')
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    // 3. Check if receipt already exists
    const { data: existingReceipt } = await supabaseAdmin
      .from('non_fiscal_receipts')
      .select('id')
      .eq('booking_id', booking_id)
      .maybeSingle();

    if (existingReceipt) {
      console.log('[NON-FISCAL-RECEIPT] Receipt already exists');
      return new Response(
        JSON.stringify({ message: 'Receipt already exists', receipt_id: existingReceipt.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 4. Fetch coworker data
    const { data: coworker } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', booking.user_id)
      .single();

    // 5. Generate receipt number (host-specific sequence)
    const { count } = await supabaseAdmin
      .from('non_fiscal_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', host.id);

    const receiptNumber = `${host.id.substring(0, 8).toUpperCase()}-${String((count || 0) + 1).padStart(4, '0')}`;
    const receiptDate = new Date().toISOString().split('T')[0];

    // 6. Generate PDF
    const pdfContent = generateReceiptPDF({
      receiptNumber,
      receiptDate,
      host,
      coworker,
      booking,
      payment,
      space: (booking as any).spaces
    });

    // 7. Upload PDF to storage
    const pdfFileName = `${booking_id}/${receiptNumber}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('non-fiscal-receipts')
      .upload(pdfFileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`PDF upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl: pdfUrl } } = supabaseAdmin.storage
      .from('non-fiscal-receipts')
      .getPublicUrl(pdfFileName);

    // 8. Insert receipt record
    const { data: receipt, error: receiptError } = await supabaseAdmin
      .from('non_fiscal_receipts')
      .insert({
        booking_id: booking_id,
        payment_id: payment.id,
        host_id: host.id,
        coworker_id: booking.user_id,
        receipt_number: receiptNumber,
        receipt_date: receiptDate,
        canone_amount: payment.host_amount,
        discount_amount: 0,
        total_amount: payment.host_amount,
        includes_coworker_cf: false, // Privacy default
        pdf_url: pdfUrl
      })
      .select()
      .single();

    if (receiptError) {
      throw new Error(`Failed to create receipt: ${receiptError.message}`);
    }

    // 9. Send notification to host
    await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: host.id,
        type: 'receipt',
        title: 'Ricevuta Non Fiscale Generata',
        content: `La ricevuta ${receiptNumber} per la prenotazione del ${booking.booking_date} è disponibile.`,
        metadata: {
          receipt_id: receipt.id,
          receipt_number: receiptNumber,
          booking_id: booking_id,
          pdf_url: pdfUrl
        }
      });

    // 10. Optional: Notify coworker
    await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: booking.user_id,
        type: 'receipt',
        title: 'Ricevuta Disponibile',
        content: `La ricevuta per la tua prenotazione presso "${(booking as any).spaces.title}" è disponibile.`,
        metadata: {
          receipt_id: receipt.id,
          receipt_number: receiptNumber,
          booking_id: booking_id
        }
      });

    console.log('[NON-FISCAL-RECEIPT] Receipt created successfully:', receiptNumber);

    return new Response(
      JSON.stringify({ 
        success: true,
        receipt_id: receipt.id,
        receipt_number: receiptNumber,
        pdf_url: pdfUrl
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
  const { receiptNumber, receiptDate, host, coworker, booking, payment, space } = data;
  
  return `
╔════════════════════════════════════════════════════════╗
║         RICEVUTA NON FISCALE - WORKOVER               ║
╚════════════════════════════════════════════════════════╝

Numero: ${receiptNumber}
Data: ${new Date(receiptDate).toLocaleDateString('it-IT')}

────────────────────────────────────────────────────────

EMITTENTE
${host.first_name} ${host.last_name}
Email: ${host.email}

RICEVENTE
${coworker?.first_name || ''} ${coworker?.last_name || ''}

────────────────────────────────────────────────────────

SERVIZIO PRESTATO
Utilizzo spazio coworking: "${space.title}"

Data Servizio: ${new Date(booking.booking_date).toLocaleDateString('it-IT')}
Orario: ${booking.start_time} - ${booking.end_time}

────────────────────────────────────────────────────────

IMPORTO
Canone: €${payment.host_amount.toFixed(2)}

TOTALE: €${payment.host_amount.toFixed(2)}

────────────────────────────────────────────────────────

Riferimento Prenotazione: ${booking.id}
Riferimento Piattaforma: WorkOver

────────────────────────────────────────────────────────

⚠️  DISCLAIMER LEGALE
Documento non valido ai fini fiscali, emesso esclusivamente 
per tracciabilità della transazione.

Questa ricevuta non costituisce fattura o documento fiscale 
ai sensi del DPR 633/72 e successive modificazioni.

────────────────────────────────────────────────────────

Generato automaticamente da WorkOver Platform
${new Date().toLocaleString('it-IT')}
`;
}
