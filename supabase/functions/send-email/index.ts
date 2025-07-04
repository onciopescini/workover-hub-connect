import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

interface EmailRequest {
  type: string;
  to: string;
  data?: any;
}

const emailTemplates = {
  welcome: (data: any) => ({
    subject: "Benvenuto in Workover! 🎉",
    html: `
      <h1>Benvenuto in Workover, ${data.firstName}!</h1>
      <p>Siamo entusiasti di averti nella nostra community di coworker e host.</p>
      <p>Ecco cosa puoi fare ora:</p>
      <ul>
        <li>Completa il tuo profilo</li>
        <li>Esplora gli spazi di coworking disponibili</li>
        <li>Connettiti con altri professionisti</li>
      </ul>
      <p><a href="${data.dashboardUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Vai alla Dashboard</a></p>
      <p>Buon lavoro!<br>Il Team Workover</p>
    `
  }),

  booking_confirmation: (data: any) => ({
    subject: "Prenotazione Confermata - Workover",
    html: `
      <h1>Prenotazione Confermata! ✅</h1>
      <p>La tua prenotazione è stata confermata con successo.</p>
      <p><strong>Dettagli:</strong></p>
      <ul>
        <li>ID Prenotazione: ${data.booking_id}</li>
        <li>Importo: €${(data.amount / 100).toFixed(2)}</li>
        <li>Valuta: ${data.currency?.toUpperCase()}</li>
      </ul>
      <p>Riceverai ulteriori dettagli dall'host a breve.</p>
      <p>Buon lavoro!<br>Il Team Workover</p>
    `
  }),

  stripe_setup_complete: (data: any) => ({
    subject: "Setup Stripe Completato - Workover",
    html: `
      <h1>Congratulazioni ${data.firstName}! 🎉</h1>
      <p>Il tuo account Stripe è stato configurato con successo!</p>
      <p>Ora puoi:</p>
      <ul>
        <li>✅ Pubblicare i tuoi spazi di coworking</li>
        <li>✅ Ricevere pagamenti dai coworker</li>
        <li>✅ Gestire le tue prenotazioni</li>
      </ul>
      <p><a href="${data.dashboardUrl}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Vai alla Dashboard Host</a></p>
      <p>Il Team Workover</p>
    `
  }),

  connection_request: (data: any) => ({
    subject: "Nuova Richiesta di Connessione - Workover",
    html: `
      <h1>Nuova Richiesta di Connessione</h1>
      <p>${data.senderName} vuole connettersi con te su Workover.</p>
      <p><a href="${data.profileUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Visualizza Profilo</a></p>
      <p>Il Team Workover</p>
    `
  }),

  review_received: (data: any) => ({
    subject: "Nuova Recensione Ricevuta - Workover",
    html: `
      <h1>Hai ricevuto una nuova recensione!</h1>
      <p>${data.reviewerName} ha lasciato una recensione con ${data.rating} stelle.</p>
      <p><strong>Commento:</strong> "${data.comment}"</p>
      <p><a href="${data.reviewUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Visualizza Recensione</a></p>
      <p>Il Team Workover</p>
    `
  }),

  booking_cancelled: (data: any) => ({
    subject: "Prenotazione Cancellata - Workover",
    html: `
      <h1>Prenotazione Cancellata</h1>
      <p>La prenotazione per "${data.spaceTitle}" è stata cancellata.</p>
      <p><strong>Motivo:</strong> ${data.reason || 'Non specificato'}</p>
      ${data.cancellationFee > 0 ? `<p><strong>Penale:</strong> €${data.cancellationFee}</p>` : ''}
      <p>Per ulteriori informazioni, contatta il supporto.</p>
      <p>Il Team Workover</p>
    `
  }),

  space_approval_needed: (data: any) => ({
    subject: "Nuovo Spazio da Approvare - Admin Workover",
    html: `
      <h1>Nuovo Spazio Richiede Approvazione</h1>
      <p><strong>Spazio:</strong> ${data.spaceTitle}</p>
      <p><strong>Host:</strong> ${data.hostName}</p>
      <p><strong>Categoria:</strong> ${data.category}</p>
      <p><strong>Prezzo:</strong> €${data.pricePerDay}/giorno</p>
      <p><a href="${data.adminUrl}" style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Approva/Rifiuta</a></p>
      <p>Admin Panel Workover</p>
    `
  }),

  support_ticket: (data: any) => ({
    subject: `Nuovo Ticket Supporto #${data.ticketId} - Workover`,
    html: `
      <h1>Nuovo Ticket di Supporto</h1>
      <p><strong>ID:</strong> #${data.ticketId}</p>
      <p><strong>Oggetto:</strong> ${data.subject}</p>
      <p><strong>Utente:</strong> ${data.userName} (${data.userEmail})</p>
      <p><strong>Messaggio:</strong></p>
      <blockquote style="border-left: 4px solid #3B82F6; padding-left: 16px; margin-left: 0;">
        ${data.message}
      </blockquote>
      <p><a href="${data.adminUrl}" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Gestisci Ticket</a></p>
      <p>Admin Panel Workover</p>
    `
  })
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data }: EmailRequest = await req.json();

    ErrorHandler.logInfo('Sending email', { type, to, hasData: !!data });

    if (!emailTemplates[type as keyof typeof emailTemplates]) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const template = emailTemplates[type as keyof typeof emailTemplates](data);

    const emailResponse = await resend.emails.send({
      from: "Workover <noreply@workover.app>",
      to: [to],
      subject: template.subject,
      html: template.html,
    });

    ErrorHandler.logSuccess('Email sent successfully', { 
      type,
      to,
      emailId: emailResponse.data?.id 
    });

    return new Response(JSON.stringify({ success: true, id: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    ErrorHandler.logError('Error sending email', error, {
      errorMessage: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
