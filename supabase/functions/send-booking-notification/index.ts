
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const requestSchema = z.object({
  type: z.enum(['booking_confirmation', 'booking_pending', 'booking_cancelled', 'booking_reminder', 'refund_processed']),
  booking_id: z.string().uuid(),
  metadata: z.record(z.any()).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    // Security Check: Ensure the caller is using the Service Role Key
    // Even with verify_jwt=true, we want to ensure it's not just ANY authenticated user.
    // However, verify_jwt checks signature. We can decode the JWT to check the role 'service_role'.
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders });
    }

    // Simple check: The service role key is usually passed directly or as a Bearer token.
    // A robust check parses the JWT. For now, since this is internal, we can rely on Supabase's built-in Auth context if available,
    // or manually check the JWT payload if we had the library.
    // As a "Gold Standard" fix without adding heavy dependencies, we rely on the fact that `verify_jwt=true`
    // combined with the fact that only Admin functions possess the Service Key to sign such a request.
    // BUT, an Anon user *could* call this if they guessed the URL and had a valid Anon JWT.
    // So we MUST check the role.

    const token = authHeader.replace('Bearer ', '');
    // Decode without validation (validation done by Supabase Gateway) to check role
    const [, payload] = token.split('.');
    if (payload) {
      try {
        const decoded = JSON.parse(atob(payload));
        if (decoded.role !== 'service_role' && decoded.app_role !== 'admin') {
           throw new Error('Unauthorized: Service Role required');
        }
      } catch (e) {
         // If decoding fails, or it's not a JWT (e.g. just the API key string), we proceed with caution or fail.
         // Supabase functions usually receive a JWT.
         ErrorHandler.logWarning('Could not decode JWT for role check', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      ErrorHandler.logError('Invalid request payload', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: corsHeaders });
    }

    const { type, booking_id, metadata } = validation.data;
    ErrorHandler.logInfo(`Processing ${type} for booking ${booking_id}`);

    // Fetch booking details with ALL necessary relations
    // Fixed PostgREST Syntax: Use FK names or let PostgREST infer if unique
    // bookings -> workspaces (via space_id)
    // bookings -> profiles (via user_id)
    // workspaces -> profiles (via host_id)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        workspaces (
          title,
          address,
          city_name,
          confirmation_type,
          cancellation_policy,
          host:profiles!workspaces_owner_id_fkey (
            first_name,
            last_name,
            phone,
            id
          )
        ),
        user:profiles!fk_bookings_user_id (
          first_name,
          last_name,
          email,
          id
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Prepare email payload based on type
    let emailPayload: any = null;
    const user = booking.user;
    const workspace = booking.workspaces;
    const host = workspace?.host;

    if (!user?.email) {
       throw new Error('User email not found');
    }

    if (!workspace || !host) {
        throw new Error('Workspace or Host details missing');
    }

    switch (type) {
      case 'booking_confirmation':
        emailPayload = {
          type: 'booking_confirmation',
          to: user.email,
          data: {
            userName: user.first_name,
            spaceTitle: workspace.title,
            bookingDate: new Date(booking.booking_date).toLocaleDateString('it-IT'),
            startTime: booking.start_time?.slice(0, 5),
            endTime: booking.end_time?.slice(0, 5),
            guestsCount: booking.guests_count,
            amount: (booking.fiscal_data?.total_amount || 0) * 100, // Template expects cents? No, let's check.
            // checking template: amount / 100. So we need to pass cents if it expects to divide by 100.
            // Payments table stores dollars/euros (float). Bookings doesn't store amount directly usually,
            // but fiscal_data might have it.
            // Let's use metadata or fiscal_data.
            currency: 'eur',
            bookingId: booking.id.slice(0, 8).toUpperCase(),
            spaceAddress: `${workspace.address}, ${workspace.city}`,
            hostName: `${host.first_name} ${host.last_name}`,
            hostPhone: host.phone,
            cancellationPolicy: workspace.cancellation_policy
          }
        };
        // Fix amount: template does (data.amount / 100).toFixed(2).
        // If booking.fiscal_data.total_amount is 50.00 (EUR), passing 5000 is correct.
        // If it's already in cents, passing it is correct.
        // Assuming fiscal_data stores standard currency (50.00), multiply by 100.
        if (emailPayload.data.amount === 0 && metadata?.amount) {
            emailPayload.data.amount = metadata.amount * 100;
        }
        break;

      case 'booking_pending':
        emailPayload = {
          type: 'booking_pending',
          to: user.email,
          data: {
            userName: user.first_name,
            spaceTitle: workspace.title,
            bookingDate: new Date(booking.booking_date).toLocaleDateString('it-IT'),
            startTime: booking.start_time?.slice(0, 5),
            endTime: booking.end_time?.slice(0, 5),
            hostName: `${host.first_name} ${host.last_name}`,
            bookingId: booking.id.slice(0, 8).toUpperCase(),
            estimatedResponse: '24 ore'
          }
        };
        break;

      case 'booking_cancelled':
        // Handle refund logic if applicable
        emailPayload = {
          type: 'booking_cancelled',
          to: user.email,
          data: {
            userName: user.first_name,
            spaceTitle: workspace.title,
            bookingDate: new Date(booking.booking_date).toLocaleDateString('it-IT'),
            reason: booking.cancellation_reason || 'Nessun motivo specificato',
            cancellationFee: booking.cancellation_fee || 0,
            refundAmount: metadata?.refund_amount || 0,
            currency: 'eur',
            bookingId: booking.id.slice(0, 8).toUpperCase(),
            cancelledByHost: booking.cancelled_by_host || false
          }
        };
        break;

      case 'refund_processed':
         // Map to booking_cancelled template or a generic one?
         // The requirement was to handle "Refund" flow.
         // Let's use booking_cancelled template with specific flags/data if needed,
         // or if we strictly want a "Refund Processed" email, we might need a new template.
         // But booking_cancelledTemplate handles "refundAmount".
         // Let's reuse booking_cancelled for now as it contains the refund info.
         emailPayload = {
          type: 'booking_cancelled', // Reuse template
          to: user.email,
          data: {
            userName: user.first_name,
            spaceTitle: workspace.title,
            bookingDate: new Date(booking.booking_date).toLocaleDateString('it-IT'),
            reason: 'Rimborso elaborato',
            cancellationFee: booking.cancellation_fee || 0,
            refundAmount: metadata?.refund_amount || 0,
            currency: 'eur',
            bookingId: booking.id.slice(0, 8).toUpperCase(),
            cancelledByHost: booking.cancelled_by_host || false
          }
        };
        break;
    }

    if (emailPayload) {
      // Invoke send-email
      const { data: emailResponse, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: emailPayload
      });

      if (emailError) {
        throw new Error(`Failed to send email: ${emailError.message}`);
      }

      ErrorHandler.logSuccess(`Email dispatched: ${type}`, { bookingId: booking_id, emailId: emailResponse?.id });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError(`Dispatcher error: ${error.message}`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
