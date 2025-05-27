
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatusType } from "@/types/common";
import { RefreshCw, Download } from "lucide-react";

interface PaymentWithDetails {
  id: string;
  user_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  method?: string;
  receipt_url?: string;
  stripe_session_id?: string;
  created_at: string;
  booking: {
    booking_date: string;
    status: string;
    space: {
      title: string;
      host_id: string;
    };
  } | null;
  user: {
    first_name: string;
    last_name: string;
  } | null;
}

interface PaymentListItemProps {
  payment: PaymentWithDetails;
  userRole?: string;
  onRetryPayment: (paymentId: string, bookingId: string, amount: number) => void;
  onDownloadReceipt: (receiptUrl: string) => void;
}

export function PaymentListItem({ 
  payment, 
  userRole, 
  onRetryPayment, 
  onDownloadReceipt 
}: PaymentListItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="font-semibold">
            {payment.booking?.space?.title || 'Spazio non disponibile'}
          </h4>
          <StatusBadge status={payment.payment_status as StatusType} />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>€{payment.amount.toFixed(2)}</span>
          <span>
            {userRole === 'host' 
              ? `Cliente: ${payment.user?.first_name || ''} ${payment.user?.last_name || ''}`
              : `Data: ${payment.booking?.booking_date ? new Date(payment.booking.booking_date).toLocaleDateString('it-IT') : 'N/A'}`
            }
          </span>
          <span>{new Date(payment.created_at).toLocaleDateString('it-IT')}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {payment.payment_status === 'failed' && userRole !== 'host' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetryPayment(payment.id, payment.booking_id, payment.amount)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Riprova
          </Button>
        )}
        
        {payment.receipt_url && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownloadReceipt(payment.receipt_url!)}
          >
            <Download className="w-4 h-4 mr-2" />
            Ricevuta
          </Button>
        )}
      </div>
    </div>
  );
}
