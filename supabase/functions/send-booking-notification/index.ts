
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 0. Security Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Verify User/Role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    // Check for Service Role (often has special ID or role) or Admin
    // If invoked with Service Role Key, the user might be null or specific.
    // However, Supabase Edge Functions invoked with Service Role Key usually bypass RLS if using Admin client,
    // but here we are checking WHO CALLED it.

    // If called via `supabaseAdmin.functions.invoke`, it uses the key provided in the invoke call?
    // Actually, `supabase.functions.invoke` sends the current session's auth header by default,
    // unless we override it.
    // In `stripe-webhooks`, we use `supabaseAdmin`, so we are likely calling as Service Role?
    // Wait, `supabaseAdmin` (createClient with Service Key) does NOT automatically attach the Service Key to `functions.invoke`
    // unless we explicitly pass it in headers or if the client is configured to use it.
    // The standard `functions.invoke` uses the *session* of the client.
    // `supabaseAdmin` has no session (persistSession: false).
    // We should ensure the caller is trusted.

    // Simplified Security for Phase 2:
    // Check if the user has 'service_role' role (if signed with service key) OR is an Admin.

    let isAuthorized = false;

    // Check 1: Is it a Service Role token?
    // We can decode the JWT to check the role 'service_role'.
    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'service_role') {
        isAuthorized = true;
      }
    } catch (e) {
      // Token parsing failed, ignore
    }

    // Check 2: Is it an Admin user?
    if (!isAuthorized && user) {
      const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { user_id: user.id });
      if (isAdmin) isAuthorized = true;
    }

    if (!isAuthorized) {
       // Allow if specifically called by our own internal functions (which might use Service Key)
       // The 'service_role' check above covers the Service Key.
       throw new Error('Unauthorized: Caller must be Admin or Service Role');
    }

    const { booking_id, type } = await req.json();

    if (!booking_id || !type) {
      throw new Error('Missing booking_id or type');
    }

    // 1. Fetch Booking Data (with joins)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        workspaces:space_id (
          title,
          address,
          host_id,
          cancellation_policy
        ),
        profiles:user_id (
          first_name,
          last_name,
          phone,
          email
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // 2. Fetch Host Profile
    const { data: hostProfile, error: hostError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, phone, email')
      .eq('user_id', booking.workspaces.host_id)
      .single();

    if (hostError || !hostProfile) {
      throw new Error('Host profile not found');
    }

    // 3. Prepare Notification Data
    const guestName = `${booking.profiles.first_name || ''} ${booking.profiles.last_name || ''}`.trim();
    const hostName = `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim();
    const spaceTitle = booking.workspaces.title;

    // Format helpers
    const formatDate = (date: string) => new Date(date).toLocaleDateString('it-IT');
    const formatTime = (time: string) => time?.slice(0, 5); // HH:MM
    const formatCurrency = (amount: number, currency: string) =>
      new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(amount);

    let emailRequest: any = null;
    let notificationRequest: any = null;

    switch (type) {
      case 'confirmation': {
        // Target: Guest
        // Context: Booking Confirmed (Instant or Accepted)

        emailRequest = {
          type: 'booking_confirmation',
          to: booking.profiles.email,
          data: {
            userName: guestName,
            spaceTitle: spaceTitle,
            bookingDate: formatDate(booking.booking_date),
            startTime: formatTime(booking.start_time),
            endTime: formatTime(booking.end_time),
            guestsCount: booking.guests_count || 1,
            amount: (booking.total_price || 0) * 100,
            currency: booking.currency || 'eur',
            bookingId: booking.id,
            spaceAddress: booking.workspaces.address,
            hostName: hostName,
            hostPhone: hostProfile.phone,
            cancellationPolicy: booking.workspaces.cancellation_policy
          }
        };

        notificationRequest = {
          user_id: booking.user_id,
          type: 'booking',
          title: 'Prenotazione Confermata! 🎉',
          content: `La tua prenotazione per "${spaceTitle}" è stata confermata.`,
          metadata: { booking_id: booking.id, type: 'confirmation' }
        };
        break;
      }

      case 'new_request': {
        // Target: Host
        // Context: New Request Pending Approval

        emailRequest = {
          type: 'new_booking_request',
          to: hostProfile.email,
          data: {
            hostName: hostName,
            guestName: guestName,
            spaceTitle: spaceTitle,
            bookingDate: formatDate(booking.booking_date),
            startTime: formatTime(booking.start_time),
            endTime: formatTime(booking.end_time),
            guestsCount: booking.guests_count || 1,
            bookingId: booking.id,
            guestPhone: booking.profiles.phone,
            estimatedEarnings: booking.total_price || 0,
            currency: booking.currency || 'eur'
          }
        };

        notificationRequest = {
          user_id: booking.workspaces.host_id,
          type: 'booking',
          title: 'Nuova Richiesta di Prenotazione 🔔',
          content: `${guestName} ha richiesto di prenotare "${spaceTitle}".`,
          metadata: { booking_id: booking.id, type: 'new_request' }
        };
        break;
      }

      case 'host_confirmation': {
        // Target: Host
        // Context: Instant Booking Confirmed (Notification only)
        // No Email for now (Legacy behavior preserved)

        notificationRequest = {
          user_id: booking.workspaces.host_id,
          type: 'booking',
          title: 'Nuova Prenotazione Confermata! 🚀',
          content: `Hai ricevuto una nuova prenotazione confermata per "${spaceTitle}".`,
          metadata: { booking_id: booking.id, type: 'confirmation' }
        };
        break;
      }

      case 'refund': {
        // Target: Guest
        // Context: Admin processed refund (Cancellation)

        const refundAmount = booking.total_price || 0;

        emailRequest = {
          type: 'booking_cancelled',
          to: booking.profiles.email,
          data: {
            userName: guestName,
            spaceTitle: spaceTitle,
            bookingDate: formatDate(booking.booking_date),
            reason: 'Rimborso elaborato dall\'amministrazione',
            cancellationFee: booking.cancellation_fee || 0,
            refundAmount: refundAmount,
            currency: booking.currency || 'eur',
            bookingId: booking.id,
            cancelledByHost: false
          }
        };

        notificationRequest = {
          user_id: booking.user_id,
          type: 'booking',
          title: 'Rimborso Completato 💰',
          content: `Il rimborso per la prenotazione "${spaceTitle}" è stato elaborato.`,
          metadata: { booking_id: booking.id, type: 'refund' }
        };
        break;
      }

      default:
        throw new Error(`Invalid notification type: ${type}`);
    }

    // 4. Send Email (via send-email function)
    if (emailRequest) {
      console.log(`[Dispatcher] Invoking send-email for ${type} to ${emailRequest.to}`);
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: emailRequest
      });

      if (emailError) {
        console.error('[Dispatcher] Failed to send email:', emailError);
      }
    } else {
      console.log(`[Dispatcher] Skipping email for type: ${type}`);
    }

    // 5. Send In-App Notification
    if (notificationRequest) {
      console.log(`[Dispatcher] Inserting notification for user ${notificationRequest.user_id}`);
      const { error: notifError } = await supabaseAdmin
        .from('user_notifications')
        .insert(notificationRequest);

      if (notifError) {
        console.error('[Dispatcher] Failed to insert notification:', notifError);
        throw new Error(`Notification insert failed: ${notifError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications dispatched' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[Dispatcher] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
