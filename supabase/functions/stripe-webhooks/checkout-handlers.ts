
import Stripe from "https://esm.sh/stripe@15.0.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Payment calculator with dual commission model
function calculatePaymentBreakdown(baseAmount: number) {
  const buyerFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100;
  const buyerTotalAmount = baseAmount + buyerFeeAmount;
  
  const hostFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100;
  const hostNetPayout = baseAmount - hostFeeAmount;
  
  const platformRevenue = buyerFeeAmount + hostFeeAmount;

  return {
    baseAmount,
    buyerFeeAmount,
    buyerTotalAmount,
    hostFeeAmount,
    hostNetPayout,
    platformRevenue
  };
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  console.log('🔵 Checkout session completed:', session.id);
  
  if (session.metadata?.booking_id) {
    const bookingId = session.metadata.booking_id;
    const buyerTotalAmount = session.amount_total || 0; // Amount paid by buyer (in cents)
    const baseAmount = parseFloat(session.metadata.base_amount || '0');
    const breakdown = calculatePaymentBreakdown(baseAmount);

    // Update payment status
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({ 
        payment_status: 'completed',
        receipt_url: session.receipt_url,
        host_amount: breakdown.hostNetPayout,
        platform_fee: breakdown.platformRevenue
      })
      .eq('stripe_session_id', session.id);

    if (paymentError) {
      console.error('🔴 Error updating payment:', paymentError);
    } else {
      console.log('✅ Payment updated successfully');
    }

    // Get booking details
    const { data: booking, error: bookingFetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        space_id,
        user_id,
        spaces!inner (
          id,
          confirmation_type,
          host_id,
          title
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingFetchError) {
      console.error('🔴 Error fetching booking details:', bookingFetchError);
      return;
    }

    // Determine booking status based on confirmation type
    let newStatus = 'pending';
    let notificationTitle = '';
    let notificationContent = '';

    if (booking.spaces.confirmation_type === 'instant') {
      newStatus = 'confirmed';
      notificationTitle = 'Prenotazione confermata!';
      notificationContent = `La tua prenotazione presso "${booking.spaces.title}" è stata confermata automaticamente. Buon lavoro!`;
    } else {
      newStatus = 'pending';
      notificationTitle = 'Prenotazione in attesa di approvazione';
      notificationContent = `La tua prenotazione presso "${booking.spaces.title}" è in attesa di approvazione dall'host. Riceverai una notifica appena verrà confermata.`;
    }

    // Update booking status
    const { error: bookingError } = await supabaseAdmin
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (bookingError) {
      console.error('🔴 Error updating booking:', bookingError);
    } else {
      console.log(`✅ Booking ${newStatus} successfully`);
    }

    // Handle host transfers and notifications with new payment model
    await handleHostTransferAndNotifications(booking, breakdown, session, supabaseAdmin);
  }
}

export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  console.log('⚠️ Checkout session expired:', session.id);
  
  // Update payment status to failed/expired
  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .update({ payment_status: 'failed' })
    .eq('stripe_session_id', session.id);

  if (paymentError) {
    console.error('🔴 Error updating expired payment:', paymentError);
  } else {
    console.log('✅ Expired payment status updated');
  }
}

async function handleHostTransferAndNotifications(
  booking: any,
  breakdown: ReturnType<typeof calculatePaymentBreakdown>,
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  // Get host's Stripe account for transfer
  const { data: hostProfile, error: hostError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_account_id, stripe_connected')
    .eq('id', booking.spaces.host_id)
    .single();

  if (hostProfile?.stripe_connected && hostProfile.stripe_account_id) {
    try {
      console.log('💰 Transfer breakdown:', {
        buyerTotalAmount: breakdown.buyerTotalAmount,
        hostNetPayout: breakdown.hostNetPayout,
        platformRevenue: breakdown.platformRevenue
      });

      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2023-10-16',
      });

      // Transfer the host net payout amount
      const transfer = await stripe.transfers.create({
        amount: Math.round(breakdown.hostNetPayout * 100), // Convert to cents
        currency: 'eur',
        destination: hostProfile.stripe_account_id,
        description: `Pagamento per prenotazione ${booking.id}`,
        metadata: {
          booking_id: booking.id,
          space_id: booking.space_id,
          host_id: booking.spaces.host_id,
          base_amount: breakdown.baseAmount.toString(),
          host_fee: breakdown.hostFeeAmount.toString()
        }
      });

      console.log('✅ Transfer created successfully:', transfer.id);

      // Record transfer in database
      await supabaseAdmin
        .from('payments')
        .update({
          stripe_transfer_id: transfer.id
        })
        .eq('stripe_session_id', session.id);

    } catch (transferError) {
      console.error('🔴 Error creating transfer:', transferError);
      // Continue with notifications even if transfer fails
    }
  } else {
    console.log('⚠️ Host Stripe account not connected, skipping transfer');
  }

  // Send notifications
  await sendBookingNotifications(booking, breakdown, supabaseAdmin);
}

async function sendBookingNotifications(
  booking: any, 
  breakdown: ReturnType<typeof calculatePaymentBreakdown>,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  // Send notification to coworker
  const notificationTitle = booking.spaces.confirmation_type === 'instant' 
    ? 'Prenotazione confermata!'
    : 'Prenotazione in attesa di approvazione';
  
  const notificationContent = booking.spaces.confirmation_type === 'instant'
    ? `La tua prenotazione presso "${booking.spaces.title}" è stata confermata automaticamente. Buon lavoro!`
    : `La tua prenotazione presso "${booking.spaces.title}" è in attesa di approvazione dall'host. Riceverai una notifica appena verrà confermata.`;

  await supabaseAdmin
    .from('user_notifications')
    .insert({
      user_id: booking.user_id,
      type: 'booking',
      title: notificationTitle,
      content: notificationContent,
      metadata: {
        booking_id: booking.id,
        space_title: booking.spaces.title,
        confirmation_type: booking.spaces.confirmation_type,
        amount_paid: breakdown.buyerTotalAmount
      }
    });

  // If booking requires host approval, notify the host
  if (booking.spaces.confirmation_type === 'host_approval') {
    await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: booking.spaces.host_id,
        type: 'booking',
        title: 'Nuova richiesta di prenotazione',
        content: `Hai ricevuto una nuova richiesta di prenotazione per "${booking.spaces.title}". Vai alla dashboard per approvarla.`,
        metadata: {
          booking_id: booking.id,
          space_title: booking.spaces.title,
          action_required: 'approve_booking',
          host_payout: breakdown.hostNetPayout
        }
      });
  } else {
    // Notify host of confirmed booking and payment
    await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: booking.spaces.host_id,
        type: 'booking',
        title: 'Nuova prenotazione confermata',
        content: `Hai ricevuto una prenotazione per "${booking.spaces.title}". Riceverai €${breakdown.hostNetPayout.toFixed(2)} come pagamento.`,
        metadata: {
          booking_id: booking.id,
          space_title: booking.spaces.title,
          payment_received: true,
          host_payout: breakdown.hostNetPayout
        }
      });
  }
}
