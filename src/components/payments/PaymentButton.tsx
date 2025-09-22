
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreditCard, Loader2, Info } from "lucide-react";
import { createPaymentSession, validatePayment, calculatePaymentBreakdown } from "@/lib/payment-utils";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";

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
  const { info, error } = useLogger({ context: 'PaymentButton' });

  // Calculate breakdown with dual commission model
  const breakdown = calculatePaymentBreakdown(amount);

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      info('Starting payment process', { bookingId, breakdown });
      
      // This component needs space details for the new API
      toast.error("PaymentButton deprecato - usa TwoStepBookingForm", {
        description: (
          <>
            Usa il componente TwoStepBookingForm per il nuovo flusso di pagamento
            <span data-testid="payment-error-toast" className="sr-only">payment-error</span>
          </>
        ),
      });
      return;
    } catch (paymentError) {
      error('Payment error', paymentError as Error, { bookingId, amount });
      toast.error("Errore nel processare il pagamento");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Breakdown del prezzo con dual commission model */}
      <div className="bg-gray-50 p-3 rounded-lg text-sm">
        <div className="flex justify-between items-center mb-1">
          <span>Prezzo base:</span>
          <span>€{breakdown.baseAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-1 text-gray-600">
          <span>Commissione servizio (5%):</span>
          <span>€{breakdown.buyerFeeAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center font-semibold pt-1 border-t">
          <span>Totale da pagare:</span>
          <span>€{breakdown.buyerTotalAmount.toFixed(2)}</span>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={disabled || isLoading}
        className={`w-full ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4 mr-2" />
        )}
        {isLoading ? "Elaborazione..." : `Paga €${breakdown.buyerTotalAmount.toFixed(2)}`}
      </Button>
      
      {/* Tooltip con carte test Stripe */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center text-xs text-gray-500 cursor-help">
              <Info className="w-3 h-3 mr-1" />
              Modalità test - Carte test disponibili
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="text-xs space-y-1">
              <p className="font-semibold">Carte test Stripe:</p>
              <p>• Visa: 4242 4242 4242 4242</p>
              <p>• Mastercard: 5555 5555 5555 4444</p>
              <p>• Scadenza: qualsiasi data futura</p>
              <p>• CVC: qualsiasi 3 cifre</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default PaymentButton;
