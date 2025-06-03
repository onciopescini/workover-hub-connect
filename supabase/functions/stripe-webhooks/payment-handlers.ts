
import Stripe from "https://esm.sh/stripe@15.0.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function handleRefundCreated(
  refund: Stripe.Refund,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  console.log('🔵 Refund created:', refund.id);
  
  // Cerca il pagamento corrispondente usando il payment_intent
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('booking_id, user_id')
    .eq('stripe_session_id', refund.payment_intent)
    .single();
    
  if (paymentError) {
    console.error('🔴 Error finding payment:', paymentError);
    return;
  }
  
  if (payment) {
    // Aggiorna lo stato del pagamento
    await supabaseAdmin
      .from('payments')
      .update({ payment_status: 'refunded' })
      .eq('stripe_session_id', refund.payment_intent);
    
    // Notifica l'utente del rimborso completato
    await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: payment.user_id,
        type: 'booking',
        title: 'Rimborso completato',
        content: 'Il rimborso per la prenotazione cancellata è stato elaborato con successo',
        metadata: {
          booking_id: payment.booking_id,
          refund_amount: refund.amount / 100,
          currency: refund.currency
        }
      });
    
    console.log('✅ Refund processed and user notified');
  }
}

export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  console.error('🔴 Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
  
  // Update payment status to failed
  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .update({ payment_status: 'failed' })
    .eq('stripe_session_id', paymentIntent.id);

  if (paymentError) {
    console.error('🔴 Error updating failed payment:', paymentError);
  } else {
    console.log('✅ Payment status updated to failed');
  }
}
