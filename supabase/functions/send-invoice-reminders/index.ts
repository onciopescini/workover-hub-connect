import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log('[send-invoice-reminders] Starting reminder job');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Query payments requiring host invoice with approaching deadline
    const { data: paymentsNeedingReminder, error: paymentsError } = await supabaseClient
      .from('payments')
      .select(`
        id,
        booking_id,
        host_invoice_deadline,
        host_amount,
        bookings (
          id,
          booking_date,
          space_id,
          user_id,
          spaces (
            id,
            title,
            host_id,
            profiles!spaces_host_id_fkey (
              id,
              email,
              first_name,
              last_name,
              fiscal_regime,
              vat_number,
              pec_email,
              sdi_code
            )
          )
        )
      `)
      .eq('host_invoice_required', true)
      .eq('host_invoice_reminder_sent', false)
      .lte('host_invoice_deadline', twoDaysFromNow.toISOString())
      .gte('host_invoice_deadline', now.toISOString());

    if (paymentsError) {
      console.error('[send-invoice-reminders] Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    console.log(`[send-invoice-reminders] Found ${paymentsNeedingReminder?.length || 0} payments needing reminders`);

    let remindersSent = 0;

    // Process each payment
    for (const payment of paymentsNeedingReminder || []) {
      try {
        const booking = payment.bookings;
        const space = booking?.spaces;
        const host = space?.profiles;

        if (!host || !booking) {
          console.warn('[send-invoice-reminders] Missing data for payment:', payment.id);
          continue;
        }

        const deadline = new Date(payment.host_invoice_deadline);
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send in-app notification
        await supabaseClient
          .from('user_notifications')
          .insert({
            user_id: host.id,
            type: 'invoice',
            title: 'PROMEMORIA: Fattura Canone in Scadenza',
            content: `Hai ${daysRemaining} giorni per emettere la fattura per il canone della prenotazione dello spazio "${space.title}". Importo: €${payment.host_amount}. Scadenza: ${deadline.toLocaleDateString('it-IT')}`,
            metadata: {
              payment_id: payment.id,
              booking_id: booking.id,
              deadline: payment.host_invoice_deadline,
              days_remaining: daysRemaining,
              amount: payment.host_amount,
            },
          });

        // Try to send email if Resend is configured
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey && host.email) {
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'WorkOver <noreply@workover.it>',
                to: [host.email],
                subject: `PROMEMORIA - Fattura Canone Scadenza ${deadline.toLocaleDateString('it-IT')}`,
                html: `
                  <h2>Promemoria Fattura Canone</h2>
                  <p>Gentile ${host.first_name} ${host.last_name},</p>
                  <p>Ti ricordiamo che hai <strong>${daysRemaining} giorni</strong> per emettere la fattura relativa al canone della prenotazione:</p>
                  <ul>
                    <li><strong>Spazio:</strong> ${space.title}</li>
                    <li><strong>Data prenotazione:</strong> ${new Date(booking.booking_date).toLocaleDateString('it-IT')}</li>
                    <li><strong>Importo canone:</strong> €${payment.host_amount}</li>
                    <li><strong>Scadenza fattura:</strong> ${deadline.toLocaleDateString('it-IT')}</li>
                  </ul>
                  <p><strong>Dati per fatturazione:</strong></p>
                  <p>Accedi alla tua dashboard WorkOver per visualizzare i dettagli completi necessari all'emissione della fattura.</p>
                  <p><strong>IMPORTANTE:</strong> La mancata emissione della fattura entro i termini previsti potrebbe comportare la sospensione del tuo account.</p>
                  <br>
                  <p>Cordiali saluti,<br>Il Team WorkOver</p>
                `,
              }),
            });

            if (!emailResponse.ok) {
              console.error('[send-invoice-reminders] Resend error:', await emailResponse.text());
            } else {
              console.log('[send-invoice-reminders] Email sent to:', host.email);
            }
          } catch (emailError) {
            console.error('[send-invoice-reminders] Error sending email:', emailError);
          }
        }

        // Mark reminder as sent
        await supabaseClient
          .from('payments')
          .update({ host_invoice_reminder_sent: true })
          .eq('id', payment.id);

        remindersSent++;
        console.log(`[send-invoice-reminders] Reminder sent for payment ${payment.id}`);

      } catch (error) {
        console.error('[send-invoice-reminders] Error processing payment:', payment.id, error);
      }
    }

    // Check for credit notes required
    const { data: creditNotesNeeded, error: creditNotesError } = await supabaseClient
      .from('payments')
      .select(`
        id,
        booking_id,
        credit_note_deadline,
        host_amount,
        bookings (
          id,
          spaces (
            host_id,
            title,
            profiles!spaces_host_id_fkey (
              id,
              email,
              first_name,
              last_name
            )
          )
        )
      `)
      .eq('credit_note_required', true)
      .eq('credit_note_issued_by_host', false)
      .lte('credit_note_deadline', twoDaysFromNow.toISOString());

    if (!creditNotesError && creditNotesNeeded && creditNotesNeeded.length > 0) {
      console.log(`[send-invoice-reminders] Found ${creditNotesNeeded.length} credit notes needed`);

      for (const payment of creditNotesNeeded) {
        const booking = payment.bookings;
        const space = booking?.spaces;
        const host = space?.profiles;

        if (!host) continue;

        // Send credit note reminder notification
        await supabaseClient
          .from('user_notifications')
          .insert({
            user_id: host.id,
            type: 'invoice',
            title: 'Nota Credito Richiesta',
            content: `È richiesta l'emissione di una nota credito per la prenotazione dello spazio "${space.title}". Contatta il supporto per maggiori dettagli.`,
            metadata: {
              payment_id: payment.id,
              booking_id: booking.id,
              type: 'credit_note',
            },
          });
      }
    }

    console.log(`[send-invoice-reminders] Job completed. Reminders sent: ${remindersSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersSent,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[send-invoice-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
