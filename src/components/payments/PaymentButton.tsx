
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { createPaymentSession, validatePayment } from "@/lib/payment-utils";
import { toast } from "sonner";

interface PaymentButtonProps {
  bookingId: string;
  amount: number;
  currency?: string;
  disabled?: boolean;
  className?: string;
  onPaymentSuccess?: () => void;
}

const PaymentButton = ({ 
  bookingId, 
  amount, 
  currency = "EUR", 
  disabled = false, 
  className,
  onPaymentSuccess
}: PaymentButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      console.log('🔵 Starting payment process for booking:', bookingId);
      
      const session = await createPaymentSession(bookingId, amount, currency);
      
      if (session?.payment_url) {
        console.log('🔵 Redirecting to Stripe Checkout:', session.payment_url);
        
        // Apri Stripe Checkout in una nuova finestra
        const checkoutWindow = window.open(session.payment_url, '_blank');
        
        if (checkoutWindow) {
          // Controlla periodicamente se la finestra è stata chiusa
          const checkClosed = setInterval(async () => {
            if (checkoutWindow.closed) {
              clearInterval(checkClosed);
              console.log('🔵 Checkout window closed, validating payment...');
              
              // Valida il pagamento
              try {
                const isValid = await validatePayment(session.session_id);
                if (isValid) {
                  toast.success("Pagamento completato con successo!");
                  onPaymentSuccess?.();
                } else {
                  toast.info("Pagamento non completato o annullato");
                }
              } catch (error) {
                console.error('Error validating payment:', error);
                toast.error("Errore nella validazione del pagamento");
              }
            }
          }, 1000);
          
          // Timeout di sicurezza (10 minuti)
          setTimeout(() => {
            clearInterval(checkClosed);
            if (!checkoutWindow.closed) {
              checkoutWindow.close();
            }
          }, 600000);
        } else {
          toast.error("Impossibile aprire la finestra di pagamento");
        }
      } else {
        toast.error("Errore nella creazione della sessione di pagamento");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Errore nel processare il pagamento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <CreditCard className="w-4 h-4 mr-2" />
      )}
      {isLoading ? "Elaborazione..." : `Paga €${amount.toFixed(2)}`}
    </Button>
  );
};

export default PaymentButton;
