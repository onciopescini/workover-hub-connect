import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ErrorHandler } from "../_shared/error-handler.ts";

// Import all template functions
import { 
  bookingConfirmationTemplate, 
  bookingPendingTemplate, 
  bookingCancelledTemplate, 
  bookingReminderTemplate 
} from "./_templates/booking-templates.ts";
import { 
  newBookingRequestTemplate, 
  hostPayoutProcessedTemplate, 
  spaceApprovedTemplate, 
  spaceRejectedTemplate,
  hostBookingCancelledTemplate
} from "./_templates/host-templates.ts";
import { 
  welcomeTemplate, 
  passwordResetTemplate, 
  emailVerificationTemplate, 
  accountSuspendedTemplate, 
  profileVerifiedTemplate 
} from "./_templates/user-templates.ts";
import { 
  newUserRegistrationTemplate, 
  reportSubmittedTemplate, 
  systemErrorTemplate, 
  highTrafficAlertTemplate, 
  backupCompletedTemplate 
} from "./_templates/admin-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fail fast if required secrets are missing
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

if (!RESEND_API_KEY) {
  throw new Error('Missing required environment variable: RESEND_API_KEY');
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
}

const resend = new Resend(RESEND_API_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Input validation schema
const emailRequestSchema = z.object({
  type: z.string().trim().min(1).max(100),
  to: z.string().trim().email().max(255),
  data: z.any().optional()
});

interface EmailRequest {
  type: string;
  to: string;
  data?: any;
}

// Enhanced email template registry with new professional templates
const emailTemplates = {
  // User Templates
  welcome: welcomeTemplate,
  password_reset: passwordResetTemplate,
  email_verification: emailVerificationTemplate,
  account_suspended: accountSuspendedTemplate,
  profile_verified: profileVerifiedTemplate,
  
  // Booking Templates
  booking_confirmation: bookingConfirmationTemplate,
  booking_pending: bookingPendingTemplate,
  booking_cancelled: bookingCancelledTemplate,
  booking_reminder: bookingReminderTemplate,
  
  // Host Templates
  new_booking_request: newBookingRequestTemplate,
  host_payout_processed: hostPayoutProcessedTemplate,
  space_approved: spaceApprovedTemplate,
  space_rejected: spaceRejectedTemplate,
  host_booking_cancelled: hostBookingCancelledTemplate,
  
  // Admin Templates
  new_user_registration: newUserRegistrationTemplate,
  report_submitted: reportSubmittedTemplate,
  system_error: systemErrorTemplate,
  high_traffic_alert: highTrafficAlertTemplate,
  backup_completed: backupCompletedTemplate,

  // Legacy templates for backward compatibility
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
  }),

  support_ticket_confirmation: (data: any) => ({
    subject: `Ticket #${data.ticketId} Ricevuto - Workover Support`,
    html: `
      <h1>Abbiamo Ricevuto la Tua Richiesta!</h1>
      <p>Ciao ${data.firstName},</p>
      <p>Il tuo ticket di supporto è stato creato con successo:</p>
      <p><strong>Ticket ID:</strong> #${data.ticketId}</p>
      <p><strong>Oggetto:</strong> ${data.subject}</p>
      <p>Il nostro team risponderà entro 24-48 ore. Ti aggiorneremo via email.</p>
      <p>Grazie per la pazienza!<br><strong>Il Team Workover</strong></p>
    `
  }),

  // Fiscal & Invoice Templates
  host_invoice_reminder: (data: any) => ({
    subject: `Ricorda: fattura da emettere per prenotazione ${data.bookingId}`,
    html: `
      <h2>Promemoria Fatturazione</h2>
      <p>Ciao ${data.hostName},</p>
      <p>Ti ricordiamo che devi emettere fattura per la prenotazione completata il ${data.serviceDate}.</p>
      <ul>
        <li><strong>Importo canone:</strong> €${data.amount}</li>
        <li><strong>Coworker CF/P.IVA:</strong> ${data.coworkerTaxId}</li>
        <li><strong>PEC/SDI:</strong> ${data.coworkerInvoiceData}</li>
        <li><strong>Scadenza:</strong> ${data.deadline}</li>
      </ul>
      <p>Puoi scaricare il riepilogo dati dalla tua dashboard host.</p>
      <p><a href="${data.dashboardUrl}" style="background:#3b82f6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Vai alla Dashboard</a></p>
      <p>Il Team Workover</p>
    `
  }),
  
  credit_note_reminder: (data: any) => ({
    subject: `Nota di credito richiesta per prenotazione ${data.bookingId}`,
    html: `
      <h2>Richiesta Nota di Credito</h2>
      <p>Ciao ${data.hostName},</p>
      <p>È richiesta l'emissione di una nota di credito per la prenotazione cancellata.</p>
      <ul>
        <li><strong>Importo rimborso:</strong> €${data.refundAmount}</li>
        <li><strong>Fattura originale:</strong> ${data.originalInvoiceNumber}</li>
        <li><strong>Scadenza:</strong> ${data.deadline}</li>
      </ul>
      <p><a href="${data.dashboardUrl}" style="background:#3b82f6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Conferma Emissione</a></p>
      <p>Il Team Workover</p>
    `
  }),
  
  booking_frozen: (data: any) => ({
    subject: `⚠️ Prenotazione congelata - Stripe non connesso`,
    html: `
      <h2 style="color:#ef4444;">Attenzione: Prenotazione Congelata</h2>
      <p>Ciao ${data.hostName},</p>
      <p>La tua prenotazione per <strong>${data.spaceTitle}</strong> è stata congelata perché il tuo account Stripe risulta disconnesso.</p>
      <ul>
        <li><strong>Data prenotazione:</strong> ${data.bookingDate}</li>
        <li><strong>Ora:</strong> ${data.startTime} - ${data.endTime}</li>
        <li><strong>Coworker:</strong> ${data.coworkerName}</li>
      </ul>
      <p style="color:#ef4444;"><strong>Azione richiesta:</strong> Riconnetti il tuo account Stripe entro 24 ore per evitare la cancellazione automatica.</p>
      <p><a href="${data.stripeConnectUrl}" style="background:#ef4444;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Riconnetti Stripe</a></p>
      <p>Il Team Workover</p>
    `
  }),
  
  dac7_threshold_reached: (data: any) => ({
    subject: '⚠️ Soglia DAC7 Superata - Comunicazione Agenzia Entrate',
    html: `
      <h2>Soglia DAC7 Raggiunta</h2>
      <p>Ciao ${data.hostName},</p>
      <p>Hai superato le soglie previste dalla normativa DAC7 per l'anno ${data.year}:</p>
      <ul>
        <li><strong>Reddito totale:</strong> €${data.totalIncome} (soglia: €2.000)</li>
        <li><strong>Numero transazioni:</strong> ${data.totalTransactions} (soglia: 25)</li>
      </ul>
      <p><strong>Cosa significa:</strong> WorkOver comunicherà i tuoi dati all'Agenzia delle Entrate entro il 31 gennaio ${data.year + 1}, come richiesto dalla legge.</p>
      <p>Non è richiesta alcuna azione da parte tua. Ti invieremo il report completo a gennaio.</p>
      <p><a href="${data.dac7InfoUrl}" style="color:#3b82f6;text-decoration:underline;">Maggiori informazioni su DAC7</a></p>
      <p>Il Team Workover</p>
    `
  }),
  
  kyc_approved: (data: any) => ({
    subject: '✅ Documenti KYC Approvati',
    html: `
      <h2 style="color:#10b981;">Verifica KYC Completata</h2>
      <p>Ciao ${data.hostName},</p>
      <p>I tuoi documenti KYC sono stati verificati e approvati con successo!</p>
      <p>Ora puoi ricevere i pagamenti per le tue prenotazioni completate.</p>
      <p><a href="${data.dashboardUrl}" style="background:#10b981;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Vai alla Dashboard</a></p>
      <p>Il Team Workover</p>
    `
  }),
  
  kyc_rejected: (data: any) => ({
    subject: '❌ Documenti KYC da Rivedere',
    html: `
      <h2 style="color:#ef4444;">Verifica KYC Non Approvata</h2>
      <p>Ciao ${data.hostName},</p>
      <p>Purtroppo i documenti KYC caricati presentano dei problemi:</p>
      <p><strong>Motivo:</strong> ${data.rejectionReason}</p>
      <p>Ti preghiamo di caricare nuovamente i documenti corretti.</p>
      <p><a href="${data.uploadUrl}" style="background:#3b82f6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Carica Nuovi Documenti</a></p>
      <p>Il Team Workover</p>
    `
  })
};

serve(async (req) => {
  // Log function boot - Deploy version: 2025-01-24-v1
  console.log('🚀 [SEND-EMAIL] Function ready - Resend integration active');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    
    // Validate input
    const validationResult = emailRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      throw new Error(`Invalid request: ${validationResult.error.message}`);
    }
    
    const { type, to, data }: EmailRequest = validationResult.data;

    ErrorHandler.logInfo('Sending email', { type, to, hasData: !!data });

    if (!emailTemplates[type as keyof typeof emailTemplates]) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const template = emailTemplates[type as keyof typeof emailTemplates](data);

    const emailResponse = await resend.emails.send({
      from: "Workover <noreply@workover.it.com>",
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
