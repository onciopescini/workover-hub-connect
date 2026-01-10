import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { fromZonedTime } from "https://esm.sh/date-fns-tz@3.1.3";
import { subHours, isBefore, isAfter, parse } from "https://esm.sh/date-fns@3.6.0";

console.log("CHECKIN-BOOKING: Function Initialized");

serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Create Supabase Client (Auth Context)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 3. Authenticate User
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse Input
    const { booking_id } = await req.json();
    if (!booking_id) {
      throw new Error("Missing booking_id");
    }

    console.log(`[checkin-booking] Processing check-in for booking: ${booking_id} by user: ${user.id}`);
    console.log("Enforcing time validation rules");

    // 5. Fetch Booking & Workspace Details
    // We need the workspace to verify host ownership and to get timezone
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        workspaces (
          id,
          host_id,
          timezone
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("[checkin-booking] Booking fetch error:", bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. SECURITY CHECK: Verify Host Ownership
    // The requirement states: "Verify that auth.uid() matches the host_id of the workspace."
    const hostId = booking.workspaces?.host_id;

    if (user.id !== hostId) {
      console.warn(`[checkin-booking] Unauthorized access attempt. User ${user.id} is not host of booking ${booking_id} (Host: ${hostId})`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only the Host can perform check-in.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. TIME WINDOW CHECK
    const now = new Date();
    const timezone = booking.workspaces?.timezone || 'Europe/Rome';

    // Construct Booking Start/End Dates (UTC) from Local Time Strings
    // booking.booking_date is YYYY-MM-DD
    // booking.start_time is HH:MM:SS
    const startDateTimeStr = `${booking.booking_date} ${booking.start_time}`;
    const endDateTimeStr = `${booking.booking_date} ${booking.end_time}`;

    // Helper to parse "YYYY-MM-DD HH:MM:SS"
    // We use date-fns to parse assuming the string is in the specific timezone, then convert to UTC Date object
    // fromZonedTime takes the string and the IANA timezone and returns a UTC Date.
    const bookingStart = fromZonedTime(startDateTimeStr, timezone);
    const bookingEnd = fromZonedTime(endDateTimeStr, timezone);

    // Rule: Check-in allowed from 2 hours before start until end_time
    const checkInOpenTime = subHours(bookingStart, 2);

    console.log(`[checkin-booking] Time Check:`, {
      now: now.toISOString(),
      timezone,
      startStr: startDateTimeStr,
      bookingStartUTC: bookingStart.toISOString(),
      checkInOpenUTC: checkInOpenTime.toISOString(),
      bookingEndUTC: bookingEnd.toISOString()
    });

    if (isBefore(now, checkInOpenTime)) {
      return new Response(
        JSON.stringify({
          error: 'Too early to check in',
          details: `Check-in opens at ${checkInOpenTime.toLocaleString()}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isAfter(now, bookingEnd)) {
      return new Response(
        JSON.stringify({
          error: 'Booking has expired',
          details: `Booking ended at ${bookingEnd.toLocaleString()}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. EXECUTION: Update Booking
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'checked_in',
        checked_in_at: now.toISOString(),
        checked_in_by: user.id,
        check_in_method: 'qr_scan'
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error("[checkin-booking] Update failed:", updateError);
      throw new Error(`Failed to update booking: ${updateError.message}`);
    }

    console.log(`[checkin-booking] Success for booking ${booking_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Check-in successful',
        checked_in_at: now.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[checkin-booking] Error:', error);
    const err = error instanceof Error ? error : new Error('Unknown error');
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
