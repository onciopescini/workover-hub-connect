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

    console.log('[NOTIFY-HOST-INVOICE] Processing booking:', booking_id);

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
            fiscal_regime,
            pec_email,
            sdi_code,
            tax_id,
            legal_address
          )
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    const host = booking.spaces.profiles;
    
    // Check if host requires invoice
    if (!host.fiscal_regime || host.fiscal_regime === 'privato') {
      console.log('[NOTIFY-HOST-INVOICE] Host is privato, skipping');
      return new Response(
        JSON.stringify({ success: true, message: 'Host privato - no invoice required' }),
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

    // Check if already notified
    if (payment.host_invoice_required) {
      console.log('[NOTIFY-HOST-INVOICE] Already notified');
      return new Response(
        JSON.stringify({ success: true, message: 'Already notified' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fetch coworker details
    const { data: coworker, error: coworkerError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, email, tax_id, pec_email, sdi_code, legal_address')
      .eq('id', booking.user_id)
      .single();

    if (coworkerError || !coworker) {
      throw new Error(`Coworker not found: ${coworkerError?.message}`);
    }

    // Generate PDF guide content
    const pdfContent = generateInvoiceGuidePDF({
      booking,
      payment,
      host,
      coworker,
      space: booking.spaces
    });

    // Upload PDF to storage
    const fileName = `${host.id}/${booking_id}_invoice_guide.pdf`;
    const { error: uploadError } = await supabaseClient.storage
      .from('host-invoices-guide')
      .upload(fileName, new Blob([pdfContent], { type: 'application/pdf' }), {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('[NOTIFY-HOST-INVOICE] Upload error:', uploadError);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('host-invoices-guide')
      .getPublicUrl(fileName);

    // Update payment with invoice requirement
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // T+7 days

    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        host_invoice_required: true,
        host_invoice_deadline: deadline.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateError) {
      throw new Error(`Failed to update payment: ${updateError.message}`);
    }

    // Create in-app notification
    const { error: notifError } = await supabaseClient
      .from('user_notifications')
      .insert({
        user_id: host.id,
        type: 'host_invoice',
        title: 'Fattura richiesta per prenotazione servita',
        content: `Devi emettere fattura per la prenotazione del ${new Date(booking.booking_date).toLocaleDateString('it-IT')} entro ${deadline.toLocaleDateString('it-IT')}. Scarica il riepilogo dati per procedere.`,
        metadata: {
          booking_id: booking.id,
          payment_id: payment.id,
          deadline: deadline.toISOString(),
          pdf_url: publicUrl,
          space_title: booking.spaces.title,
          canone_amount: payment.host_amount
        }
      });

    if (notifError) {
      console.error('[NOTIFY-HOST-INVOICE] Notification error:', notifError);
    }

    // Send email if Resend is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && host.email) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'WorkOver <noreply@workover.app>',
            to: [host.email],
            subject: `Fattura richiesta - Prenotazione ${new Date(booking.booking_date).toLocaleDateString('it-IT')}`,
            html: `
              <h1>Ciao ${host.first_name},</h1>
              <p>La prenotazione del <strong>${new Date(booking.booking_date).toLocaleDateString('it-IT')}</strong> per lo spazio "${booking.spaces.title}" è stata completata.</p>
              <p><strong>Devi emettere fattura entro ${deadline.toLocaleDateString('it-IT')}</strong>.</p>
              <p>Importo canone: <strong>€${payment.host_amount.toFixed(2)}</strong></p>
              <h3>Dati destinatario:</h3>
              <ul>
                <li>Nome: ${coworker.first_name} ${coworker.last_name}</li>
                <li>Email: ${coworker.email}</li>
                ${coworker.tax_id ? `<li>CF/P.IVA: ${coworker.tax_id}</li>` : ''}
                ${coworker.pec_email ? `<li>PEC: ${coworker.pec_email}</li>` : ''}
                ${coworker.sdi_code ? `<li>Codice SDI: ${coworker.sdi_code}</li>` : ''}
                ${coworker.legal_address ? `<li>Indirizzo: ${coworker.legal_address}</li>` : ''}
              </ul>
              <p><a href="${publicUrl}">Scarica riepilogo completo (PDF)</a></p>
              <p>Cordiali saluti,<br>Il team WorkOver</p>
            `
          })
        });

        if (!emailResponse.ok) {
          console.error('[NOTIFY-HOST-INVOICE] Email send failed:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('[NOTIFY-HOST-INVOICE] Email error:', emailError);
      }
    }

    console.log('[NOTIFY-HOST-INVOICE] Success:', {
      booking_id,
      host_id: host.id,
      deadline: deadline.toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        deadline: deadline.toISOString(),
        pdf_url: publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[NOTIFY-HOST-INVOICE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateInvoiceGuidePDF(data: any): string {
  const { booking, payment, host, coworker, space } = data;
  
  return `
=================================================
WORKOVER - RIEPILOGO DATI PER EMISSIONE FATTURA
=================================================

DESTINATARIO FATTURA:
Nome: ${coworker.first_name} ${coworker.last_name}
Email: ${coworker.email}
${coworker.tax_id ? `CF/P.IVA: ${coworker.tax_id}` : ''}
${coworker.pec_email ? `PEC: ${coworker.pec_email}` : ''}
${coworker.sdi_code ? `Codice SDI: ${coworker.sdi_code}` : ''}
${coworker.legal_address ? `Indirizzo: ${coworker.legal_address}` : ''}

DETTAGLI PRENOTAZIONE:
Spazio: ${space.title}
Data: ${new Date(booking.booking_date).toLocaleDateString('it-IT')}
Orario: ${booking.start_time} - ${booking.end_time}
Booking ID: ${booking.id}

IMPORTI:
Canone lordo: €${payment.host_amount.toFixed(2)}
Service fee trattenuta: €${payment.platform_fee_amount.toFixed(2)}
Netto pagato a te: €${payment.host_amount.toFixed(2)}

ISTRUZIONI:
1. Emetti fattura elettronica tramite il tuo software di fatturazione
2. Importo fattura: €${payment.host_amount.toFixed(2)}
3. Causale: "Canone locazione spazio coworking - Prenotazione ${booking.id}"
4. Data fattura: Data di completamento servizio
5. Scadenza pagamento: Già pagato (indicare "pagamento anticipato")

DEADLINE: ${new Date(payment.host_invoice_deadline).toLocaleDateString('it-IT')}

Per assistenza: support@workover.app
=================================================
  `.trim();
}
