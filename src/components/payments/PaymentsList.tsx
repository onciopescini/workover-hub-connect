
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { PaymentListItem } from "./PaymentListItem";

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

interface PaymentsListProps {
  payments: PaymentWithDetails[];
  userRole?: string;
  onRetryPayment: (paymentId: string, bookingId: string, amount: number) => void;
  onDownloadReceipt: (receiptUrl: string) => void;
}

export function PaymentsList({ 
  payments, 
  userRole, 
  onRetryPayment, 
  onDownloadReceipt 
}: PaymentsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista Pagamenti</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun pagamento
            </h3>
            <p className="text-gray-600">
              Non ci sono pagamenti per il periodo selezionato.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <PaymentListItem
                key={payment.id}
                payment={payment}
                userRole={userRole}
                onRetryPayment={onRetryPayment}
                onDownloadReceipt={onDownloadReceipt}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
