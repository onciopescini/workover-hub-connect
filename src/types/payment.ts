
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
  // stripe_session_id is already in the base Payment type, no need to override
}

export const PAYMENT_STATUS = {
  pending: "In attesa",
  completed: "Completato", 
  failed: "Fallito",
  cancelled: "Cancellato"
} as const;

export const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800"
} as const;
