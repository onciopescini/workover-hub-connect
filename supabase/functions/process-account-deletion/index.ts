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

interface AccountDeletionCompleteData {
  user_name: string;
  deletion_date: string;
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

const createAccountDeletionCompleteEmail = (data: AccountDeletionCompleteData): EmailTemplate => {
  const content = `
    ${createHeader('Account Cancellato', 'Conferma definitiva')}
    ${createContent(`
      <h2>Ciao ${data.user_name},</h2>
      <p>Questo messaggio conferma che il tuo account Workover è stato cancellato con successo.</p>
      
      <div class="info-box success">
        <p style="margin: 0;"><strong>✅ Cancellazione completata</strong></p>
        <p style="margin-top: 8px;">Data cancellazione: ${new Date(data.deletion_date).toLocaleString('it-IT')}</p>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Azioni eseguite:</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>✅ Dati personali eliminati dal profilo</li>
        <li>✅ Informazioni di contatto rimosse</li>
        <li>✅ Cronologia messaggi cancellata</li>
        <li>✅ Preferenze e impostazioni eliminate</li>
        <li>✅ Account di accesso disattivato</li>
      </ul>

      <div class="info-box">
        <p style="margin: 0;"><strong>📋 Dati conservati per obblighi legali:</strong></p>
        <p style="margin-top: 8px;">In conformità con le normative fiscali e contabili italiane, alcune informazioni sono state anonimizzate ma conservate:</p>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Prenotazioni e transazioni (anonimizzate)</li>
          <li>Ticket di supporto (anonimizzati)</li>
          <li>Dati di fatturazione (per 10 anni per legge)</li>
        </ul>
      </div>

      <h3 style="margin-top: 32px; margin-bottom: 12px; font-size: 18px;">Cosa puoi fare ora:</h3>
      
      <div class="info-box success">
        <p style="margin: 0;"><strong>💚 Ripensaci?</strong></p>
        <p style="margin-top: 8px;">Se in futuro desideri tornare a utilizzare Workover, puoi creare un nuovo account in qualsiasi momento. I tuoi dati precedenti non saranno recuperabili.</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://workover.it.com/register" class="button">
          Crea un nuovo account
        </a>
      </div>

      <h3 style="margin-top: 32px; margin-bottom: 12px; font-size: 18px;">Feedback importante:</h3>
      <p>Ci dispiace vederti andare! Se vuoi, aiutaci a migliorare condividendo il motivo della tua cancellazione:</p>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="mailto:feedback@workover.it.com?subject=Feedback Cancellazione Account" class="button" style="background: linear-gradient(135deg, #6b7280, #4b5563);">
          💬 Invia Feedback
        </a>
      </div>

      <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
        <strong>Hai domande sui dati conservati?</strong><br>
        Per qualsiasi domanda riguardante i tuoi dati o il processo di cancellazione, contatta il nostro Data Protection Officer (DPO) a <a href="mailto:privacy@workover.it.com">privacy@workover.it.com</a>
      </p>

      <div class="info-box" style="margin-top: 24px;">
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          <strong>Questa è l'ultima email</strong> che riceverai da Workover, salvo comunicazioni relative a obblighi legali. Grazie per aver fatto parte della nostra community.
        </p>
      </div>
    `)}
  `;

  return {
    subject: 'Account Workover Cancellato - Conferma Definitiva',
    html: createBaseTemplate(content, 'Account Cancellato - Workover')
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

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token richiesto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token and get deletion request
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !deletionRequest) {
      return new Response(
        JSON.stringify({ error: 'Token non valido o scaduto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(deletionRequest.expires_at);
    if (now > expiresAt) {
      await supabase
        .from('account_deletion_requests')
        .update({ status: 'expired' })
        .eq('id', deletionRequest.id);

      return new Response(
        JSON.stringify({ error: 'Token scaduto. Richiedi una nuova cancellazione.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update deletion request status
    await supabase
      .from('account_deletion_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', deletionRequest.id);

    // Get user data before deletion for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', deletionRequest.user_id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Utente';
    const userEmail = profile?.email;

    // GDPR-compliant account deletion
    // 1. Anonymize personal data in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: 'Utente',
        last_name: 'Cancellato',
        email: `deleted_${deletionRequest.user_id}@workover.it.com`,
        bio: null,
        avatar_url: null,
        linkedin_url: null,
        website_url: null,
        phone_number: null,
        is_suspended: true,
        data_retention_exempt: false,
      })
      .eq('id', deletionRequest.user_id);

    if (profileError) {
      console.error('Error anonymizing profile:', profileError);
    }

    // 2. Delete sensitive user data (messages, preferences, etc.)
    // Keep bookings and reviews for legal/business reasons (anonymized)
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', deletionRequest.user_id);

    // 2b. Anonymize messages - set sender_id to NULL for GDPR compliance
    await supabase
      .from('messages')
      .update({ sender_id: null })
      .eq('sender_id', deletionRequest.user_id);

    // 2c. Anonymize reviews - set author_id to NULL for GDPR compliance
    await supabase
      .from('booking_reviews')
      .update({ author_id: null })
      .eq('author_id', deletionRequest.user_id);

    // 3. Delete auth user (this will cascade delete related data)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      deletionRequest.user_id
    );

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return new Response(
        JSON.stringify({ error: "Errore durante la cancellazione dell'account" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account ${deletionRequest.user_id} deleted successfully`);

    // Send confirmation email
    if (isEmailConfigured() && userEmail) {
      const emailTemplate = createAccountDeletionCompleteEmail({
        user_name: userName,
        deletion_date: new Date().toISOString()
      });

      const emailResult = await sendEmailWithRetry({
        to: userEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });

      if (!emailResult.success) {
        console.error('[PROCESS-DELETION] Failed to send confirmation email', { 
          error: emailResult.error 
        });
        // Don't fail the request - deletion was successful
      } else {
        console.log('[PROCESS-DELETION] Confirmation email sent successfully');
      }
    } else {
      console.warn('[PROCESS-DELETION] Email not configured or no user email, skipping confirmation email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account cancellato con successo',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-account-deletion:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

