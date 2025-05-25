
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
);

interface TicketRequest {
  user_id: string;
  subject: string;
  message: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, subject, message, category = 'other' }: TicketRequest = await req.json();

    console.log(`Creating support ticket for user: ${user_id}`);

    // Validate required fields
    if (!user_id || !subject || !message) {
      throw new Error('Missing required fields: user_id, subject, message');
    }

    // Get user profile for email notifications
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Get user email from auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    
    if (authError) {
      console.error('Error fetching user auth data:', authError);
    }

    // Create support ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id,
        subject,
        message,
        status: 'open'
      })
      .select()
      .single();

    if (ticketError) {
      throw ticketError;
    }

    console.log('Support ticket created:', ticket.id);

    // Create user notification
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
      console.error('Failed to create user notification:', notificationError);
    }

    // Send email notification to admin
    try {
      const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@workover.app';
      
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          type: 'support_ticket',
          to: adminEmail,
          data: {
            ticketId: ticket.id,
            subject,
            message,
            userName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown User',
            userEmail: authUser?.user?.email || 'Unknown Email',
            adminUrl: `${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://workover.app'}/admin`
          }
        }
      });
    } catch (emailError) {
      console.error('Failed to send admin email notification:', emailError);
    }

    // Send confirmation email to user
    if (authUser?.user?.email) {
      try {
        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: 'support_ticket_confirmation',
            to: authUser.user.email,
            data: {
              ticketId: ticket.id,
              subject,
              firstName: userProfile?.first_name || 'Utente'
            }
          }
        });
      } catch (emailError) {
        console.error('Failed to send user confirmation email:', emailError);
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
    console.error('Error creating support ticket:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
