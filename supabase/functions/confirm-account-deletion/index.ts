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

interface AccountDeletionConfirmationData {
  user_name: string;
  confirmation_link: string;
  expiration_hours: number;
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
      color: #333333;
      background-color: #f8fafc;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    
    .header {
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 16px;
    }
    
    .content {
      padding: 32px 24px;
    }
    
    .content h2 {
      color: #1f2937;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .content p {
      margin-bottom: 16px;
      font-size: 16px;
      color: #4b5563;
    }
    
    .content ul {
      margin: 16px 0;
      padding-left: 24px;
    }
    
    .content li {
      margin-bottom: 8px;
      color: #4b5563;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 16px 0;
      transition: all 0.2s;
    }
    
    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .button.success {
      background: linear-gradient(135deg, #10b981, #059669);
    }
    
    .button.warning {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    
    .button.danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    
    .info-box {
      background-color: #f0f9ff;
      border: 1px solid #e0f2fe;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    
    .info-box.success {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }
    
    .info-box.warning {
      background-color: #fefce8;
      border-color: #fde047;
    }
    
    .info-box.error {
      background-color: #fef2f2;
      border-color: #fecaca;
    }
    
    .details-table {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    
    .details-table table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .details-table td {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .details-table td:first-child {
      font-weight: 600;
      color: #374151;
      width: 120px;
    }
    
    .details-table td:last-child {
      color: #6b7280;
    }
    
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    
    .social-links {
      margin-top: 16px;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #6b7280;
      text-decoration: none;
    }
    
    @media (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      
      .header, .content, .footer {
        padding: 24px 16px;
      }
      
      .button {
        display: block;
        text-align: center;
        margin: 16px 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p><strong>Workover</strong> - La piattaforma per il coworking professionale</p>
      <p>Questo è un messaggio automatico, non rispondere a questa email.</p>
      <div class="social-links">
        <a href="https://workover.it.com">Sito Web</a> |
        <a href="https://workover.it.com/support">Supporto</a> |
        <a href="https://workover.it.com/privacy">Privacy</a>
      </div>
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

const createAccountDeletionConfirmationEmail = (data: AccountDeletionConfirmationData): EmailTemplate => {
  const content = `
    ${createHeader('Conferma Cancellazione Account', '⚠️ Azione richiesta')}
    ${createContent(`
      <h2>Ciao ${data.user_name},</h2>
      <p>Hai richiesto la cancellazione permanente del tuo account Workover.</p>
      
      <div class="info-box error">
        <p style="margin: 0;"><strong>⚠️ ATTENZIONE: Questa azione è irreversibile!</strong></p>
        <p style="margin-top: 8px;">Una volta confermata, tutti i tuoi dati personali verranno eliminati in conformità al GDPR.</p>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Cosa verrà eliminato:</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>Informazioni del profilo personale</li>
        <li>Dati di contatto e preferenze</li>
        <li>Cronologia messaggi e notifiche</li>
        <li>Accesso alla piattaforma</li>
      </ul>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Cosa verrà conservato (per obblighi legali):</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>Prenotazioni passate (anonimizzate)</li>
        <li>Transazioni finanziarie (per legge fiscale)</li>
        <li>Ticket di supporto (anonimizzati)</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.confirmation_link}" class="button danger">
          Confermo - Elimina il mio account
        </a>
      </div>

      <div class="info-box warning">
        <p style="margin: 0;"><strong>🕐 Tempo limitato</strong></p>
        <p style="margin-top: 8px;">Questo link è valido per <strong>${data.expiration_hours} ore</strong>. Dopo questo periodo dovrai fare una nuova richiesta.</p>
      </div>

      <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
        <strong>Non hai richiesto questa cancellazione?</strong><br>
        Se non hai fatto questa richiesta, ignora questa email. Il tuo account è sicuro e nessuna azione verrà intrapresa senza la tua conferma esplicita tramite il link sopra.
      </p>

      <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">
        Se hai domande o vuoi discutere la tua decisione, contatta il nostro supporto a <a href="mailto:support@workover.it.com">support@workover.it.com</a>
      </p>
    `)}
  `;

  return {
    subject: '⚠️ Conferma Cancellazione Account Workover',
    html: createBaseTemplate(content, 'Conferma Cancellazione - Workover')
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { reason } = await req.json();

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Check for existing pending requests
    const { data: existingRequest } = await supabase
      .from('account_deletion_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: 'Hai già una richiesta di cancellazione in attesa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create deletion request
    const { data: deletionRequest, error: createError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        token,
        status: 'pending',
        reason,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating deletion request:', createError);
      return new Response(
        JSON.stringify({ error: 'Errore durante la creazione della richiesta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account deletion request created for user ${user.id} with token ${token}`);

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Utente';

    // Send confirmation email
    if (isEmailConfigured()) {
      const confirmationUrl = `https://workover.it.com/privacy/confirm-deletion/${token}`;
      
      const emailTemplate = createAccountDeletionConfirmationEmail({
        user_name: userName,
        confirmation_link: confirmationUrl,
        expiration_hours: 24
      });

      const emailResult = await sendEmailWithRetry({
        to: user.email!,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });

      if (!emailResult.success) {
        console.error('[CONFIRM-DELETION] Failed to send confirmation email', { 
          error: emailResult.error 
        });
        // Continue anyway - user can still request again
      } else {
        console.log('[CONFIRM-DELETION] Confirmation email sent successfully');
      }
    } else {
      console.warn('[CONFIRM-DELETION] Email not configured, skipping email notification');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Richiesta di cancellazione creata. Controlla la tua email per confermare.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in confirm-account-deletion:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
