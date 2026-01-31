import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { ErrorHandler } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Mappiamo i tipi della Fase 2 nello schema Zod del Main
const requestSchema = z.object({
  type: z.enum([
    'confirmation',      // Booking confirmed (instant or manual)
    'new_request',       // New booking request for host
    'host_confirmation', // Host gets confirmation of booking
    'refund',            // Refund processed (admin)
    'rejection',         // Host rejected request
    'cancellation'       // Booking cancelled by either party
  ]),
  booking_id: z.string().uuid(),
  metadata: z.record(z.any()).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 0. Security Check (Versione Main - più robusta per JWT e Service Role)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const [, payload] = token.split('.');
    if (payload) {
      try {
        const decoded = JSON.parse(atob(payload));
        // Permettiamo service_role O admin
        if (decoded.role !== 'service_role' && decoded.app_role !== 'admin') {
           throw new Error('Unauthorized: Service Role required');
        }
      } catch (e) {
         ErrorHandler.logWarning('Could not decode JWT for role check', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Validazione Input (Struttura Main)
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      ErrorHandler.logError('Invalid request payload', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: corsHeaders });
    }

    const { type, booking_id, metadata } = validation.data;
    ErrorHandler.logInfo(`Processing ${type} for booking ${booking_id}`);

    // 1. Fetch Booking Data
    // Usiamo la sintassi del MAIN (necessaria per le FK corrette)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        spaces (
          title,
          address,
          city_name,
          cancellation_policy,
          host:profiles!spaces_owner_id_fkey (
            first_name,
            last_name,
            phone,
            email,
            id
          )
        ),
        user:profiles!fk_bookings_user_id (
          first_name,
          last_name,
          email,
          phone,
          id
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // 2. Prepare Data (Logica FASE 2 adattata alla struttura dati del Main)
    const guestName = `${booking.user.first_name || ''} ${booking.user.last_name || ''}`.trim();
    const hostProfile = booking.spaces.host;
    const hostName = `${hostProfile.first_name || ''} ${hostProfile.last_name || ''}`.trim();
    const spaceTitle = booking.spaces.title;

    // Format helpers
    const formatDate = (date: string) => new Date(date).toLocaleDateString('it-IT');
    const formatTime = (time: string) => time?.slice(0, 5); // HH:MM

    let emailRequest: any = null;
    let notificationRequest: any = null;

    // LOGICA BUSINESS FASE 2
    switch (type) {
      case 'confirmation': {
        emailRequest = {
          type: 'booking_confirmation',
          to: booking.user.email,
          data: {
            userName: guestName,
            spaceTitle: spaceTitle,
            bookingDate: formatDate(booking.booking_date),
            startTime: formatTime(booking.start_time),
            endTime: formatTime(booking.end_time),
            guestsCount: booking.guests_count || 1,
            amount: (booking.total_price || 0) * 100, // Cents conversion
            currency: booking.currency || 'eur',
            bookingId: booking.id,
            spaceAddress: booking.spaces.address,
            hostName: hostName,
            hostPhone: hostProfile.phone,
            cancellationPolicy: booking.spaces.cancellation_policy
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
            guestPhone: booking.user.phone,
            estimatedEarnings: booking.total_price || 0,
            currency: booking.currency || 'eur'
          }
        };

        notificationRequest = {
          user_id: hostProfile.id,
          type: 'booking',
          title: 'Nuova Richiesta di Prenotazione 🔔',
          content: `${guestName} ha richiesto di prenotare "${spaceTitle}".`,
          metadata: { booking_id: booking.id, type: 'new_request' }
        };
        break;
      }

      case 'host_confirmation': {
        notificationRequest = {
          user_id: hostProfile.id,
          type: 'booking',
          title: 'Nuova Prenotazione Confermata! 🚀',
          content: `Hai ricevuto una nuova prenotazione confermata per "${spaceTitle}".`,
          metadata: { booking_id: booking.id, type: 'confirmation' }
        };
        break;
      }

      case 'refund': {
        const refundAmount = booking.total_price || 0;
        emailRequest = {
          type: 'booking_cancelled',
          to: booking.user.email,
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

      case 'rejection': {
        // Notify Guest that their request was rejected
        emailRequest = {
          type: 'booking_cancelled',  // Reuse existing cancellation template
          to: booking.user.email,
          data: {
            userName: guestName,
            spaceTitle: spaceTitle,
            bookingDate: formatDate(booking.booking_date),
            reason: metadata?.reason || 'L\'host non ha potuto accettare la tua richiesta',
            cancellationFee: 0,
            refundAmount: 0, // Authorization released, no actual refund
            currency: booking.currency || 'eur',
            bookingId: booking.id,
            cancelledByHost: true
          }
        };

        notificationRequest = {
          user_id: booking.user_id,
          type: 'booking',
          title: 'Richiesta Rifiutata ❌',
          content: `L'host ha rifiutato la tua richiesta per "${spaceTitle}".`,
          metadata: { booking_id: booking.id, type: 'rejection', reason: metadata?.reason }
        };

        // Also notify Host (confirmation of their action)
        const hostRejectionNotification = {
          user_id: hostProfile.id,
          type: 'booking',
          title: 'Richiesta Rifiutata',
          content: `Hai rifiutato la richiesta di ${guestName} per "${spaceTitle}".`,
          metadata: { booking_id: booking.id, type: 'rejection_confirmed' }
        };

        // Insert host notification (non-blocking)
        await supabaseAdmin.from('user_notifications').insert(hostRejectionNotification);
        break;
      }

      case 'cancellation': {
        const cancelledByHost = metadata?.cancelled_by_host === true;
        const refundAmount = metadata?.refund_amount || 0;
        const cancellationFee = metadata?.cancellation_fee || 0;

        // Email to Guest
        emailRequest = {
          type: 'booking_cancelled',
          to: booking.user.email,
          data: {
            userName: guestName,
            spaceTitle: spaceTitle,
            bookingDate: formatDate(booking.booking_date),
            reason: metadata?.reason || (cancelledByHost ? 'Cancellata dall\'host' : 'Cancellata su richiesta'),
            cancellationFee: cancellationFee,
            refundAmount: refundAmount,
            currency: booking.currency || 'eur',
            bookingId: booking.id,
            cancelledByHost: cancelledByHost
          }
        };

        // In-App notification to the affected party
        if (cancelledByHost) {
          // Host cancelled → Notify Guest
          notificationRequest = {
            user_id: booking.user_id,
            type: 'booking',
            title: 'Prenotazione Cancellata ❌',
            content: `L'host ha cancellato la prenotazione per "${spaceTitle}". Riceverai un rimborso completo.`,
            metadata: { booking_id: booking.id, type: 'cancellation', refund_amount: refundAmount }
          };
        } else {
          // Guest cancelled → Notify Host
          notificationRequest = {
            user_id: hostProfile.id,
            type: 'booking',
            title: 'Prenotazione Cancellata ❌',
            content: `${guestName} ha cancellato la prenotazione per "${spaceTitle}".`,
            metadata: { booking_id: booking.id, type: 'cancellation' }
          };
        }
        break;
      }

      default:
        throw new Error(`Invalid notification type: ${type}`);
    }

    // 4. Send Email (Gestita con ErrorHandler)
    if (emailRequest) {
      ErrorHandler.logInfo(`Invoking send-email for ${type} to ${emailRequest.to}`);
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: emailRequest
      });

      if (emailError) {
        ErrorHandler.logError('Failed to send email:', emailError);
      }
    }

    // 5. Send In-App Notification (Nuova aggiunta Fase 2)
    if (notificationRequest) {
      ErrorHandler.logInfo(`Inserting notification for user ${notificationRequest.user_id}`);
      const { error: notifError } = await supabaseAdmin
        .from('user_notifications')
        .insert(notificationRequest);

      if (notifError) {
        ErrorHandler.logError('Failed to insert notification:', notifError);
        throw new Error(`Notification insert failed: ${notifError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notifications dispatched' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    ErrorHandler.logError(`Dispatcher error: ${error.message}`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
