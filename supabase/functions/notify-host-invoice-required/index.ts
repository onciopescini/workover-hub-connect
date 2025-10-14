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
    console.log('[HOST-INVOICE-NOTIFY] Processing booking:', booking_id);

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
            fiscal_regime,
            pec_email,
            sdi_code
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
    
    // Only notify hosts with P.IVA (forfettario or ordinario)
    if (!host.fiscal_regime || host.fiscal_regime === 'privato') {
      console.log('[HOST-INVOICE-NOTIFY] Host is not P.IVA, skipping');
      return new Response(
        JSON.stringify({ message: 'Host does not require invoice' }),
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

    // Check if already notified
    if (payment.host_invoice_required) {
      console.log('[HOST-INVOICE-NOTIFY] Already notified');
      return new Response(
        JSON.stringify({ message: 'Host already notified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 3. Fetch coworker data
    const { data: coworker } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, fiscal_regime, pec_email, sdi_code')
      .eq('id', booking.user_id)
      .single();

    // 4. Generate PDF guide with fiscal data
    const pdfContent = generateInvoiceGuidePDF({
      booking,
      payment,
      host,
      coworker,
      space: (booking as any).spaces
    });

    // 5. Upload PDF to storage
    const pdfFileName = `${host.id}/${booking_id}_invoice_guide.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('host-invoices-guide')
      .upload(pdfFileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('[HOST-INVOICE-NOTIFY] PDF upload error:', uploadError);
    }

    const { data: { publicUrl: pdfUrl } } = supabaseAdmin.storage
      .from('host-invoices-guide')
      .getPublicUrl(pdfFileName);

    // 6. Set deadline (T+7 days)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    // 7. Update payment
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        host_invoice_required: true,
        host_invoice_deadline: deadline.toISOString()
      })
      .eq('id', payment.id);

    if (updateError) {
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }

    // 8. Send in-app notification
    await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: host.id,
        type: 'invoice',
        title: 'Fattura Canone da Emettere',
        content: `Devi emettere fattura per la prenotazione del ${booking.booking_date}. Scadenza: ${deadline.toLocaleDateString('it-IT')}`,
        metadata: {
          booking_id: booking_id,
          payment_id: payment.id,
          deadline: deadline.toISOString(),
          pdf_url: pdfUrl
        }
      });

    // 9. Send email notification (if Resend configured)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'WorkOver <noreply@workover.it>',
            to: [host.email],
            subject: `Fattura Canone da Emettere - Scadenza ${deadline.toLocaleDateString('it-IT')}`,
            html: `
              <h2>Fattura Canone da Emettere</h2>
              <p>Gentile ${host.first_name},</p>
              <p>Ti informiamo che devi emettere fattura per il canone della prenotazione:</p>
              <ul>
                <li><strong>Spazio:</strong> ${(booking as any).spaces.title}</li>
                <li><strong>Data:</strong> ${booking.booking_date}</li>
                <li><strong>Importo Canone:</strong> €${payment.host_amount}</li>
                <li><strong>Scadenza:</strong> ${deadline.toLocaleDateString('it-IT')}</li>
              </ul>
              <p><a href="${pdfUrl}">Scarica PDF con dati fiscali</a></p>
              <p><strong>Dati Obbligatori:</strong></p>
              <ul>
                <li>Codice Fiscale/P.IVA Coworker: ${coworker?.fiscal_regime === 'privato' ? 'Richiedi in chat' : 'Vedi PDF'}</li>
                <li>PEC/SDI: ${coworker?.pec_email || coworker?.sdi_code || 'Richiedi in chat'}</li>
                <li>Riferimento: Prenotazione ${booking_id}</li>
              </ul>
              <p>Cordiali saluti,<br>Team WorkOver</p>
            `
          })
        });

        if (!emailResponse.ok) {
          console.error('[HOST-INVOICE-NOTIFY] Email send error:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('[HOST-INVOICE-NOTIFY] Email error:', emailError);
      }
    }

    console.log('[HOST-INVOICE-NOTIFY] Notification sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        deadline: deadline.toISOString(),
        pdf_url: pdfUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[HOST-INVOICE-NOTIFY] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateInvoiceGuidePDF(data: any): string {
  const { booking, payment, host, coworker, space } = data;
  
  return `
GUIDA EMISSIONE FATTURA CANONE
================================

HOST: ${host.first_name} ${host.last_name}
Regime Fiscale: ${host.fiscal_regime}

DATI PRENOTAZIONE
-----------------
Spazio: ${space.title}
Data: ${booking.booking_date}
Orario: ${booking.start_time} - ${booking.end_time}
ID Prenotazione: ${booking.id}

IMPORTI
-------
Canone Lordo: €${payment.host_amount}

DESTINATARIO FATTURA
--------------------
Nome: ${coworker?.first_name || ''} ${coworker?.last_name || ''}
Email: ${coworker?.email || ''}
PEC: ${coworker?.pec_email || 'Da richiedere'}
Codice SDI: ${coworker?.sdi_code || 'Da richiedere'}
P.IVA/CF: ${coworker?.fiscal_regime !== 'privato' ? 'Vedi profilo coworker' : 'Da richiedere'}

ISTRUZIONI
----------
1. Emettere fattura entro 7 giorni da oggi
2. Includere riferimento "Prenotazione ${booking.id}"
3. Inviare copia PDF a WorkOver tramite dashboard
4. In caso di mancata emissione, l'account verrà sospeso

Per domande: support@workover.it
`;
}
