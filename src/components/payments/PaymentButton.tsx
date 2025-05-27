
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { createPaymentSession } from "@/lib/payment-utils";
import { toast } from "sonner";

interface PaymentButtonProps {
  bookingId: string;
  amount: number;
  currency?: string;
  disabled?: boolean;
  className?: string;
}

const PaymentButton = ({ 
  bookingId, 
  amount, 
  currency = "EUR", 
  disabled = false, 
  className 
}: PaymentButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      const session = await createPaymentSession(bookingId, amount, currency);
      
      if (session?.payment_url) {
        // Redirect to Stripe Checkout
        window.location.href = session.payment_url;
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
