
import { Database } from "@/integrations/supabase/types";

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];

export interface PaymentSession {
  id: string;
  payment_url: string;
  session_id: string;
}

export interface PaymentWithStripe extends Payment {
  stripe_transfer_id?: string;
  host_amount?: number;
  platform_fee?: number;
}

export interface PaymentWithDetails {
  id: string;
  user_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  method?: string;
  receipt_url?: string;
  stripe_session_id?: string;
  stripe_transfer_id?: string;
  host_amount?: number;
  platform_fee?: number;
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

export const PAYMENT_STATUS = {
  pending: "In attesa",
  completed: "Completato", 
  failed: "Fallito",
  cancelled: "Cancellato",
  refunded: "Rimborsato"
} as const;

export const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  refunded: "bg-blue-100 text-blue-800"
} as const;
