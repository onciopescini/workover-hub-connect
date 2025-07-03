
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, ArrowRight } from "lucide-react";
import { PaymentWithDetails, PAYMENT_STATUS, PAYMENT_STATUS_COLORS } from "@/types/payment";

interface PaymentListItemProps {
  payment: PaymentWithDetails;
  userRole: string | undefined;
  onRetryPayment: (paymentId: string, bookingId: string, amount: number) => void;
  onDownloadReceipt: (receiptUrl: string) => void;
}

export function PaymentListItem({ 
  payment, 
  userRole, 
  onRetryPayment, 
  onDownloadReceipt 
}: PaymentListItemProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {payment.booking?.space.title || 'Spazio non disponibile'}
          </h3>
          <p className="text-sm text-gray-600">
            {payment.booking?.booking_date ? 
              `Prenotazione per ${new Date(payment.booking.booking_date).toLocaleDateString('it-IT')}` :
              'Data non disponibile'
            }
          </p>
          {payment.user && (
            <p className="text-sm text-gray-500">
              Cliente: {payment.user.first_name} {payment.user.last_name}
            </p>
          )}
        </div>
        
        <div className="text-right">
          <Badge className={PAYMENT_STATUS_COLORS[payment.payment_status as keyof typeof PAYMENT_STATUS_COLORS]}>
            {PAYMENT_STATUS[payment.payment_status as keyof typeof PAYMENT_STATUS]}
          </Badge>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(payment.created_at)}
          </p>
        </div>
      </div>

      {/* Payment breakdown for hosts */}
      {userRole === 'host' && payment.payment_status === 'completed' && (
        <div className="bg-green-50 p-3 rounded-lg mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-green-800">Dettagli Pagamento</span>
            {payment.stripe_transfer_id && (
              <Badge variant="outline" className="text-green-700 border-green-300">
                Trasferito
              </Badge>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">Importo totale:</span>
              <span className="font-medium">{formatCurrency(payment.amount)}</span>
            </div>
            {payment.host_amount && (
              <div className="flex justify-between">
                <span className="text-green-700">Tuo guadagno:</span>
                <span className="font-semibold text-green-800">{formatCurrency(payment.host_amount)}</span>
              </div>
            )}
            {payment.platform_fee && (
              <div className="flex justify-between">
                <span className="text-green-600">Commissione piattaforma:</span>
                <span className="text-green-600">{formatCurrency(payment.platform_fee)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment total for coworkers */}
      {userRole !== 'host' && (
        <div className="bg-gray-50 p-3 rounded-lg mb-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Importo pagato:</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(payment.amount)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        {payment.payment_status === 'failed' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onRetryPayment(payment.id, payment.booking_id, payment.amount)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Riprova Pagamento
          </Button>
        )}
        
        {payment.payment_status === 'completed' && payment.receipt_url && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDownloadReceipt(payment.receipt_url!)}
          >
            <Download className="w-4 h-4 mr-2" />
            Scarica Ricevuta
          </Button>
        )}

        {payment.stripe_transfer_id && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.open(`https://dashboard.stripe.com/transfers/${payment.stripe_transfer_id}`, '_blank')}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Vedi Trasferimento
          </Button>
        )}
      </div>
    </div>
  );
}
