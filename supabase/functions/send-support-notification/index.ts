import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { sendEmailWithRetry, isEmailConfigured } from '../_shared/email-sender.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== INLINE EMAIL TEMPLATES ==========
interface EmailTemplate {
  subject: string;
  html: string;
}

interface SupportTicketCreatedData {
  ticket_id: string;
  user_name: string;
  category: string;
  priority: string;
  subject: string;
  message: string;
  created_at: string;
}

const createBaseTemplate = (content: string, title: string = "Workover") => `
  <!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #1f2937;
        background-color: #f9fafb;
      }
      
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .header {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 32px 24px;
        text-align: center;
      }
      
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
      }
      
      .header p {
        margin: 8px 0 0;
        font-size: 16px;
        opacity: 0.95;
      }
      
      .content {
        padding: 32px 24px;
      }
      
      h2 {
        color: #1f2937;
        font-size: 22px;
        margin-bottom: 16px;
        font-weight: 600;
      }
      
      h3 {
        color: #374151;
        font-size: 18px;
        margin-bottom: 12px;
        font-weight: 600;
      }
      
      p {
        color: #4b5563;
        margin-bottom: 16px;
        font-size: 15px;
      }
      
      .button {
        display: inline-block;
        padding: 14px 32px;
        background-color: #3b82f6;
        color: white !important;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 15px;
        margin: 24px 0;
        transition: background-color 0.2s;
      }
      
      .button:hover {
        background-color: #2563eb;
      }
      
      .button.success {
        background-color: #10b981;
      }
      
      .button.success:hover {
        background-color: #059669;
      }
      
      .button.warning {
        background-color: #f59e0b;
      }
      
      .button.warning:hover {
        background-color: #d97706;
      }
      
      .info-box {
        background-color: #eff6ff;
        border-left: 4px solid #3b82f6;
        padding: 16px;
        border-radius: 6px;
        margin: 16px 0;
      }
      
      .info-box.success {
        background-color: #f0fdf4;
        border-left-color: #10b981;
      }
      
      .info-box.warning {
        background-color: #fffbeb;
        border-left-color: #f59e0b;
      }
      
      .details-table {
        margin: 20px 0;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .details-table table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .details-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .details-table tr:last-child td {
        border-bottom: none;
      }
      
      .details-table td:first-child {
        font-weight: 600;
        color: #6b7280;
        width: 40%;
        background-color: #f9fafb;
      }
      
      .footer {
        background-color: #f9fafb;
        padding: 24px;
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        border-top: 1px solid #e5e7eb;
      }
      
      .footer a {
        color: #3b82f6;
        text-decoration: none;
      }
      
      .footer a:hover {
        text-decoration: underline;
      }
      
      ul {
        padding-left: 20px;
        margin: 12px 0;
      }
      
      li {
        margin: 8px 0;
        color: #4b5563;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${content}
      <div class="footer">
        <p style="margin: 0;">Workover - Il tuo spazio di lavoro flessibile</p>
        <p style="margin-top: 8px;">
          <a href="https://workover.it.com">www.workover.it.com</a> | 
          <a href="mailto:info@workover.it.com">info@workover.it.com</a>
        </p>
      </div>
    </div>
  </body>
  </html>
`;

const createHeader = (title: string, subtitle?: string) => `
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>
`;

const createContent = (content: string) => `
  <div class="content">
    ${content}
  </div>
`;

const createSupportTicketEmail = (data: SupportTicketCreatedData): EmailTemplate => {
  const categoryLabels: Record<string, string> = {
    'technical': 'Problema tecnico',
    'booking': 'Problema con prenotazione',
    'payment': 'Problema di pagamento',
    'account': 'Problema con account',
    'space': 'Problema con spazio',
    'feedback': 'Feedback/Suggerimenti',
    'other': 'Altro'
  };

  const priorityLabels: Record<string, string> = {
    'low': 'Bassa',
    'normal': 'Normale',
    'high': 'Alta',
    'critical': 'Critica'
  };

  const priorityColors: Record<string, string> = {
    'low': '#10b981',
    'normal': '#3b82f6',
    'high': '#f59e0b',
    'critical': '#ef4444'
  };

  const content = `
    ${createHeader('Ticket di Supporto Creato', 'Abbiamo ricevuto la tua richiesta')}
    ${createContent(`
      <h2>Ciao ${data.user_name}!</h2>
      <p>Abbiamo ricevuto il tuo ticket di supporto e il nostro team lo prenderà in carico il prima possibile.</p>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>ID Ticket:</strong> #${data.ticket_id}</p>
      </div>

      <div class="details-table">
        <table>
          <tr>
            <td><strong>Categoria</strong></td>
            <td>${categoryLabels[data.category] || data.category}</td>
          </tr>
          <tr>
            <td><strong>Priorità</strong></td>
            <td style="color: ${priorityColors[data.priority]};"><strong>${priorityLabels[data.priority] || data.priority}</strong></td>
          </tr>
          <tr>
            <td><strong>Oggetto</strong></td>
            <td>${data.subject}</td>
          </tr>
          <tr>
            <td><strong>Data</strong></td>
            <td>${new Date(data.created_at).toLocaleString('it-IT')}</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Il tuo messaggio:</h3>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>

      <div class="info-box success" style="margin-top: 24px;">
        <p style="margin: 0;"><strong>💡 Cosa succede ora?</strong></p>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Il nostro team riceverà una notifica immediata</li>
          <li>Riceverai aggiornamenti via email</li>
          <li>Puoi seguire lo stato del ticket nel tuo profilo</li>
        </ul>
      </div>

      <a href="https://workover.it.com/support" class="button">Visualizza i tuoi ticket</a>

      <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
        <strong>Tempo di risposta stimato:</strong><br>
        • Priorità Bassa/Normale: entro 48 ore<br>
        • Priorità Alta: entro 24 ore<br>
        • Priorità Critica: entro 4 ore
      </p>
    `)}
  `;

  return {
    subject: `Ticket #${data.ticket_id} - ${data.subject}`,
    html: createBaseTemplate(content, 'Ticket Creato - Workover')
  };
};

const createSupportTicketAdminEmail = (data: SupportTicketCreatedData): EmailTemplate => {
  const categoryLabels: Record<string, string> = {
    'technical': '🔧 Problema tecnico',
    'booking': '📅 Problema con prenotazione',
    'payment': '💳 Problema di pagamento',
    'account': '👤 Problema con account',
    'space': '🏢 Problema con spazio',
    'feedback': '💬 Feedback/Suggerimenti',
    'other': '📋 Altro'
  };

  const priorityLabels: Record<string, string> = {
    'low': '🟢 Bassa',
    'normal': '🔵 Normale',
    'high': '🟠 Alta',
    'critical': '🔴 Critica'
  };

  const content = `
    ${createHeader('Nuovo Ticket di Supporto', 'Richiesta da gestire')}
    ${createContent(`
      <div class="info-box warning">
        <p style="margin: 0;"><strong>⚠️ Nuovo ticket da gestire</strong></p>
        <p style="margin-top: 8px;">ID Ticket: <strong>#${data.ticket_id}</strong></p>
      </div>

      <div class="details-table">
        <table>
          <tr>
            <td><strong>Utente</strong></td>
            <td>${data.user_name}</td>
          </tr>
          <tr>
            <td><strong>Categoria</strong></td>
            <td>${categoryLabels[data.category] || data.category}</td>
          </tr>
          <tr>
            <td><strong>Priorità</strong></td>
            <td><strong>${priorityLabels[data.priority] || data.priority}</strong></td>
          </tr>
          <tr>
            <td><strong>Oggetto</strong></td>
            <td>${data.subject}</td>
          </tr>
          <tr>
            <td><strong>Data</strong></td>
            <td>${new Date(data.created_at).toLocaleString('it-IT')}</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Messaggio:</h3>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
      </div>

      <a href="https://workover.it.com/admin/tickets/${data.ticket_id}" class="button warning">Gestisci Ticket</a>
    `)}
  `;

  return {
    subject: `[SUPPORT] ${priorityLabels[data.priority]} - Ticket #${data.ticket_id}`,
    html: createBaseTemplate(content, 'Nuovo Ticket - Workover Admin')
  };
};

interface SupportNotificationRequest {
  ticket_id: string;
  user_email: string;
  user_name: string;
  category: string;
  priority: string;
  subject: string;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SUPPORT-NOTIFICATION] Starting notification process');

    // Check if email is configured
    if (!isEmailConfigured()) {
      console.warn('[SUPPORT-NOTIFICATION] RESEND_API_KEY not configured, skipping email notification');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Ticket created but email notification skipped (no API key)' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorizzazione richiesta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utente non autenticato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SupportNotificationRequest = await req.json();
    const { ticket_id, user_email, user_name, category, priority, subject, message } = body;

    if (!ticket_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Dati richiesti mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailData = {
      ticket_id,
      user_name: user_name || 'Utente',
      category,
      priority,
      subject,
      message,
      created_at: new Date().toISOString()
    };

    console.log('[SUPPORT-NOTIFICATION] Sending emails for ticket', { ticket_id, user_email });

    // Send email to user
    const userEmailTemplate = createSupportTicketEmail(emailData);
    const userEmailResult = await sendEmailWithRetry({
      to: user_email,
      subject: userEmailTemplate.subject,
      html: userEmailTemplate.html
    });

    if (!userEmailResult.success) {
      console.error('[SUPPORT-NOTIFICATION] Failed to send user email', { 
        error: userEmailResult.error 
      });
    }

    // Send email to support team
    const adminEmailTemplate = createSupportTicketAdminEmail(emailData);
    const adminEmailResult = await sendEmailWithRetry({
      to: 'support@workover.it.com',
      subject: adminEmailTemplate.subject,
      html: adminEmailTemplate.html
    });

    if (!adminEmailResult.success) {
      console.error('[SUPPORT-NOTIFICATION] Failed to send admin email', { 
        error: adminEmailResult.error 
      });
      // Don't fail the request if admin email fails
    }

    console.log('[SUPPORT-NOTIFICATION] Emails sent successfully', {
      ticket_id,
      userEmailSent: userEmailResult.success,
      adminEmailSent: adminEmailResult.success
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifiche inviate con successo',
        user_email_sent: userEmailResult.success,
        admin_email_sent: adminEmailResult.success
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[SUPPORT-NOTIFICATION] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
