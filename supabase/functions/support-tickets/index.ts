
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ErrorHandler } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface TicketRequest {
  user_id: string;
  subject: string;
  message: string;
  category?: string;
  priority?: string;
}

// Calculate response deadline based on priority
function getResponseDeadline(priority: string): string {
  const now = new Date();
  let hoursToAdd = 24; // default for normal
  
  switch (priority) {
    case 'critical':
      hoursToAdd = 2;
      break;
    case 'high':
      hoursToAdd = 8;
      break;
    case 'low':
      hoursToAdd = 48;
      break;
  }
  
  now.setHours(now.getHours() + hoursToAdd);
  return now.toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, subject, message, category = 'other', priority = 'normal' }: TicketRequest = await req.json();

    // Defensive normalization: ensure category and priority are valid
    const validCategories = ['technical', 'booking', 'payment', 'account', 'space', 'feedback', 'other'];
    const validPriorities = ['low', 'normal', 'high', 'critical'];
    
    const normalizedCategory = validCategories.includes(category) ? category : 'other';
    const normalizedPriority = validPriorities.includes(priority) ? priority : 'normal';

    ErrorHandler.logInfo('Creating support ticket', { 
      user_id: user_id || 'anonymous', 
      subject, 
      category: normalizedCategory,
      priority: normalizedPriority,
      isAnonymous: !user_id 
    });

    // Validate required fields (user_id is optional for contact form)
    if (!subject || !message) {
      throw new Error('Missing required fields: subject, message');
    }

    // For anonymous tickets, extract email from message
    let anonymousEmail = null;
    if (!user_id && message.includes('Email di contatto:')) {
      const emailMatch = message.match(/Email di contatto:\s*(\S+@\S+)/);
      if (emailMatch) {
        anonymousEmail = emailMatch[1];
      }
    }

    // Get user profile for email notifications (only if user_id provided)
    let userProfile = null;
    let authUser = null;
    
    if (user_id) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user_id)
        .single();

      if (profileError) {
        ErrorHandler.logWarning('Error fetching user profile', { error: profileError instanceof Error ? profileError.message : profileError, user_id });
      } else {
        userProfile = profile;
      }

      // Get user email from auth
      const { data: auth, error: authError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      
      if (authError) {
        ErrorHandler.logWarning('Error fetching user auth data', { error: authError instanceof Error ? authError.message : authError, user_id });
      } else {
        authUser = auth;
      }
    }

    // Create support ticket
    ErrorHandler.logInfo('[SUPPORT-TICKETS] Attempting to insert ticket into DB', {
      user_id: user_id || 'anonymous',
      subject: subject.substring(0, 50),
      category: normalizedCategory,
      priority: normalizedPriority,
      anonymousEmail
    });

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: user_id || null, // Allow null for anonymous tickets
        subject,
        message,
        category: normalizedCategory,
        priority: normalizedPriority,
        status: 'open',
        sla_status: 'on_track',
        response_deadline: getResponseDeadline(normalizedPriority)
      })
      .select()
      .single();

    if (ticketError) {
      ErrorHandler.logError('[SUPPORT-TICKETS] ❌ DB insert failed', ticketError, {
        error: ticketError,
        code: ticketError.code,
        message: ticketError.message,
        user_id
      });
      throw ticketError;
    }

    ErrorHandler.logSuccess('[SUPPORT-TICKETS] ✅ Ticket created successfully', { 
      ticketId: ticket.id, 
      user_id,
      status: ticket.status,
      priority: ticket.priority 
    });

    // Create user notification (only for authenticated users)
    if (user_id) {
      try {
        await supabaseAdmin
          .from('user_notifications')
          .insert({
            user_id,
            type: 'ticket',
            title: 'Ticket di supporto creato',
            content: `Il tuo ticket "${subject}" è stato creato. Ti risponderemo presto.`,
            metadata: {
              ticket_id: ticket.id
            }
          });
      } catch (notificationError) {
        ErrorHandler.logWarning('Failed to create user notification', { error: notificationError instanceof Error ? notificationError.message : notificationError, ticketId: ticket.id });
      }
    } else {
      ErrorHandler.logInfo('Skipping user notification for anonymous ticket', { ticketId: ticket.id });
    }

    // Send email notification to admin
    try {
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@workover.it.com';
      
      // Determine user info (authenticated or anonymous)
      const userName = userProfile 
        ? `${userProfile.first_name} ${userProfile.last_name}` 
        : (anonymousEmail ? 'Utente Anonimo' : 'Unknown User');
      
      const userEmail = authUser?.user?.email || anonymousEmail || 'Unknown Email';
      
      const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          type: 'support_ticket',
          to: adminEmail,
          data: {
            ticketId: ticket.id,
            subject,
            message,
            userName,
            userEmail,
            isAnonymous: !user_id,
            adminUrl: `${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://workover.it.com'}/admin/tickets`
          }
        }
      });
      
      if (emailError) {
        ErrorHandler.logWarning('Failed to send admin email notification', {
          error: emailError instanceof Error ? emailError.message : emailError,
          ticketId: ticket.id,
          emailResponse: emailData
        });
      } else {
        ErrorHandler.logSuccess('Admin email sent', { ticketId: ticket.id, to: adminEmail });
      }
    } catch (emailError) {
      ErrorHandler.logWarning('Exception sending admin email notification', {
        error: emailError instanceof Error ? emailError.message : emailError,
        ticketId: ticket.id
      });
    }

    // Send confirmation email to user (authenticated or anonymous)
    const userConfirmationEmail = authUser?.user?.email || anonymousEmail;
    
    if (userConfirmationEmail) {
      try {
        const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: 'support_ticket_confirmation',
            to: userConfirmationEmail,
            data: {
              ticketId: ticket.id,
              subject,
              firstName: userProfile?.first_name || 'Utente',
              isAnonymous: !user_id
            }
          }
        });
        
        if (emailError) {
          ErrorHandler.logWarning('Failed to send user confirmation email', {
            error: emailError instanceof Error ? emailError.message : emailError,
            ticketId: ticket.id,
            userEmail: userConfirmationEmail,
            emailResponse: emailData
          });
        } else {
          ErrorHandler.logSuccess('User confirmation email sent', { 
            ticketId: ticket.id, 
            to: userConfirmationEmail,
            isAnonymous: !user_id 
          });
        }
      } catch (emailError) {
        ErrorHandler.logWarning('Exception sending user confirmation email', {
          error: emailError instanceof Error ? emailError.message : emailError,
          ticketId: ticket.id,
          userEmail: userConfirmationEmail
        });
      }
    } else {
      ErrorHandler.logWarning('No email available for user confirmation', { ticketId: ticket.id });
    }

    // Check for high/critical priority - send notification to admins (only for authenticated users)
    if ((normalizedPriority === 'high' || normalizedPriority === 'critical') && user_id) {
      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
      
      if (admins) {
        for (const admin of admins) {
          await supabaseAdmin
            .from('user_notifications')
            .insert({
              user_id: admin.id,
              type: 'support_urgent',
              priority: priority,
              title: `🚨 Nuovo ticket ${normalizedPriority === 'critical' ? 'CRITICO' : 'ALTA PRIORITÀ'}`,
              content: `${userProfile?.first_name || 'Utente'}: "${subject.substring(0, 50)}..."`,
              metadata: {
                ticket_id: ticket.id,
                ticket_priority: normalizedPriority,
                ticket_category: normalizedCategory
              }
            });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, 
      ticket,
      message: 'Ticket di supporto creato con successo'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error creating support ticket', error, {
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
