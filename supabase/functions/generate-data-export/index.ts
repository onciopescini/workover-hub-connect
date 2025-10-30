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

interface DataExportReadyData {
  user_name: string;
  download_link: string;
  file_name: string;
  file_size_mb: number;
  expiration_days: number;
  expiration_date: string;
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

const createDataExportReadyEmail = (data: DataExportReadyData): EmailTemplate => {
  const content = `
    ${createHeader('Export Dati Pronto', '✅ Il tuo export è disponibile')}
    ${createContent(`
      <h2>Ciao ${data.user_name}!</h2>
      <p>Il tuo export dati è stato generato con successo ed è pronto per il download.</p>
      
      <div class="info-box success">
        <p style="margin: 0;"><strong>✅ Export completato!</strong></p>
        <p style="margin-top: 8px;">I tuoi dati sono stati raccolti e preparati in formato JSON compresso.</p>
      </div>

      <div class="details-table">
        <table>
          <tr>
            <td><strong>Nome File</strong></td>
            <td>${data.file_name}</td>
          </tr>
          <tr>
            <td><strong>Dimensione</strong></td>
            <td>${data.file_size_mb} MB</td>
          </tr>
          <tr>
            <td><strong>Formato</strong></td>
            <td>JSON (compresso)</td>
          </tr>
          <tr>
            <td><strong>Scadenza Link</strong></td>
            <td>${new Date(data.expiration_date).toLocaleString('it-IT')}</td>
          </tr>
        </table>
      </div>

      <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 18px;">Cosa contiene l'export:</h3>
      <ul style="margin-left: 20px; color: #4b5563;">
        <li>📋 Dati del profilo personale</li>
        <li>📅 Cronologia prenotazioni</li>
        <li>🎫 Ticket di supporto</li>
        <li>⚙️ Preferenze e impostazioni</li>
        <li>💬 Cronologia messaggi</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.download_link}" class="button success">
          📥 Scarica i tuoi dati
        </a>
      </div>

      <div class="info-box warning">
        <p style="margin: 0;"><strong>⏰ Disponibilità limitata</strong></p>
        <p style="margin-top: 8px;">Questo link di download è valido per <strong>${data.expiration_days} giorni</strong>. Scarica il file prima della scadenza.</p>
      </div>

      <h3 style="margin-top: 32px; margin-bottom: 12px; font-size: 18px;">Come utilizzare l'export:</h3>
      <ol style="margin-left: 20px; color: #4b5563;">
        <li>Clicca sul pulsante "Scarica i tuoi dati"</li>
        <li>Salva il file ZIP sul tuo computer</li>
        <li>Estrai il contenuto (file JSON)</li>
        <li>Apri il file con un editor di testo o JSON viewer</li>
      </ol>

      <p style="margin-top: 32px; color: #6b7280; font-size: 14px;">
        <strong>Domande sull'export?</strong><br>
        Se hai bisogno di aiuto per interpretare i dati o riscontri problemi, contatta il nostro supporto a <a href="mailto:privacy@workover.it.com">privacy@workover.it.com</a>
      </p>

      <div class="info-box" style="margin-top: 24px;">
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          <strong>Privacy e Sicurezza:</strong> Il link di download è protetto e accessibile solo a te. Non condividere questo link con altri. Il file verrà eliminato definitivamente dopo ${data.expiration_days} giorni.
        </p>
      </div>
    `)}
  `;

  return {
    subject: '✅ Export Dati Pronto - Scarica ora i tuoi dati',
    html: createBaseTemplate(content, 'Export Dati Pronto - Workover')
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

    console.log(`Generating data export for user ${user.id}`);

    // Fetch all user data
    const [
      profileData,
      bookingsData,
      ticketsData,
      preferencesData,
      messagesData,
      reviewsData,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('bookings').select('*').eq('coworker_id', user.id),
      supabase.from('support_tickets').select('*').eq('user_id', user.id),
      supabase.from('user_preferences').select('*').eq('user_id', user.id),
      supabase.from('messages').select('*').eq('sender_id', user.id),
      supabase.from('reviews').select('*').eq('reviewer_id', user.id),
    ]);

    // Create export data structure
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      profile: profileData.data || null,
      bookings: bookingsData.data || [],
      support_tickets: ticketsData.data || [],
      preferences: preferencesData.data || [],
      messages: messagesData.data || [],
      reviews: reviewsData.data || [],
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    const jsonBlob = new TextEncoder().encode(jsonString);

    // Upload to Supabase Storage
    const fileName = `export_${user.id}_${Date.now()}.json`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(fileName, jsonBlob, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading export:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Errore durante il caricamento dell\'export' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL (valid for 7 days)
    const { data: urlData } = await supabase.storage
      .from('exports')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days in seconds

    console.log(`Data export generated successfully: ${fileName}`);

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Utente';
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Send email with download link
    if (isEmailConfigured() && urlData?.signedUrl) {
      const fileSizeMB = (jsonBlob.length / (1024 * 1024)).toFixed(2);
      
      const emailTemplate = createDataExportReadyEmail({
        user_name: userName,
        download_link: urlData.signedUrl,
        file_name: fileName,
        file_size_mb: parseFloat(fileSizeMB),
        expiration_days: 7,
        expiration_date: expirationDate.toISOString()
      });

      const emailResult = await sendEmailWithRetry({
        to: user.email!,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });

      if (!emailResult.success) {
        console.error('[DATA-EXPORT] Failed to send email notification', { 
          error: emailResult.error 
        });
        // Continue anyway - user can still use the download URL from response
      } else {
        console.log('[DATA-EXPORT] Notification email sent successfully');
      }
    } else {
      console.warn('[DATA-EXPORT] Email not configured or no signed URL, skipping email notification');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Export dati generato con successo. Controlla la tua email per il link di download.',
        download_url: urlData?.signedUrl,
        expires_at: expirationDate.toISOString(),
        file_size: jsonBlob.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-data-export:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
