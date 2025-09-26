
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ErrorHandler.logInfo('Review notifications cron job started');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Trova prenotazioni confermate che sono passate da almeno 24 ore
    // e per cui non è ancora stata inviata una notifica di recensione
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: eligibleBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        user_id,
        booking_date,
        spaces:space_id (
          title,
          host_id
        )
      `)
      .eq('status', 'confirmed')
      .lte('booking_date', twentyFourHoursAgo.toISOString().split('T')[0]);

    if (bookingsError) {
      ErrorHandler.logError('Error fetching eligible bookings', bookingsError);
      throw bookingsError;
    }

    ErrorHandler.logInfo('Found eligible bookings for review notifications', {
      count: eligibleBookings?.length || 0
    });

    for (const booking of eligibleBookings || []) {
      // Controlla se esiste già una notifica per questa prenotazione
      const { data: existingNotification } = await supabaseAdmin
        .from('user_notifications')
        .select('id')
        .eq('user_id', booking.user_id)
        .eq('type', 'review')
        .contains('metadata', { booking_id: booking.id })
        .single();

      if (existingNotification) {
        ErrorHandler.logInfo('Notification already sent for booking', { bookingId: booking.id });
        continue;
      }

      // Invia notifica al coworker per recensire l'host
      const { error: notificationError } = await supabaseAdmin
        .from('user_notifications')
        .insert({
          user_id: booking.user_id,
          type: 'review',
          title: 'Lascia una recensione',
          content: `La tua prenotazione presso "${(booking.spaces as any).title}" è terminata. Lascia una recensione per condividere la tua esperienza!`,
          metadata: {
            booking_id: booking.id,
            space_title: (booking.spaces as any).title,
            target_user_id: (booking.spaces as any).host_id,
            review_type: 'booking'
          }
        });

      if (notificationError) {
        ErrorHandler.logError('Error sending coworker review notification', notificationError, {
          bookingId: booking.id
        });
      } else {
        ErrorHandler.logSuccess('Review notification sent to coworker', { bookingId: booking.id });
      }

      // Invia anche notifica all'host per recensire il coworker
      const { error: hostNotificationError } = await supabaseAdmin
        .from('user_notifications')
        .insert({
          user_id: (booking.spaces as any).host_id,
          type: 'review',
          title: 'Lascia una recensione',
          content: `La prenotazione presso "${(booking.spaces as any).title}" è terminata. Lascia una recensione per il coworker!`,
          metadata: {
            booking_id: booking.id,
            space_title: (booking.spaces as any).title,
            target_user_id: booking.user_id,
            review_type: 'booking'
          }
        });

      if (hostNotificationError) {
        ErrorHandler.logError('Error sending host review notification', hostNotificationError, {
          bookingId: booking.id
        });
      } else {
        ErrorHandler.logSuccess('Review notification sent to host', { bookingId: booking.id });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: eligibleBookings?.length || 0 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error in review notifications cron', error, {
      errorMessage: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
