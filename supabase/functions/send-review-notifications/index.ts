
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

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: eligibleBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        user_id,
        space_id,
        service_completed_at,
        spaces:space_id (
          host_id,
          title
        )
      `)
      .eq('status', 'served')
      .not('service_completed_at', 'is', null)
      .lte('service_completed_at', twentyFourHoursAgo)
      .gte('service_completed_at', fourteenDaysAgo);

    if (bookingsError) {
      ErrorHandler.logError('Error fetching eligible bookings', bookingsError);
      throw bookingsError;
    }

    ErrorHandler.logInfo('Found eligible bookings for review notifications', {
      count: eligibleBookings?.length || 0
    });

    let processedCount = 0;

    for (const booking of eligibleBookings || []) {
      const { data: existingSpaceNotif } = await supabaseAdmin
        .from('user_notifications')
        .select('id')
        .eq('user_id', booking.user_id)
        .eq('type', 'review')
        .eq('metadata->>booking_id', booking.id)
        .eq('metadata->>review_type', 'space')
        .maybeSingle();

      const { data: existingCoworkerNotif } = await supabaseAdmin
        .from('user_notifications')
        .select('id')
        .eq('user_id', (booking.spaces as any).host_id)
        .eq('type', 'review')
        .eq('metadata->>booking_id', booking.id)
        .eq('metadata->>review_type', 'coworker')
        .maybeSingle();

      if (!existingSpaceNotif) {
        await supabaseAdmin.from('user_notifications').insert({
          user_id: booking.user_id,
          type: 'review',
          title: '⭐ Lascia una recensione',
          content: `Hai utilizzato lo spazio "${(booking.spaces as any).title}". Condividi la tua esperienza!`,
          metadata: {
            booking_id: booking.id,
            space_id: booking.space_id,
            review_type: 'space'
          }
        });
      }

      if (!existingCoworkerNotif) {
        await supabaseAdmin.from('user_notifications').insert({
          user_id: (booking.spaces as any).host_id,
          type: 'review',
          title: '⭐ Lascia una recensione',
          content: `Un coworker ha completato la prenotazione presso "${(booking.spaces as any).title}". Lascia un feedback!`,
          metadata: {
            booking_id: booking.id,
            coworker_id: booking.user_id,
            review_type: 'coworker'
          }
        });
      }

      processedCount++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount
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
