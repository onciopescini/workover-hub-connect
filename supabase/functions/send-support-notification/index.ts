import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { sendEmailWithRetry, isEmailConfigured } from '../_shared/email-sender.ts';
import { createSupportTicketEmail, createSupportTicketAdminEmail } from '../send-email/_templates/support-ticket-created.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
