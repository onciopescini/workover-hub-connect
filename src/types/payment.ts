
import { Database } from "@/integrations/supabase/types";

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];

export type PaymentWithDetails = Payment & {
  booking?: {
    booking_date: string;
    space: {
      title: string;
      address: string;
    };
  } | null;
};

export const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export const PAYMENT_STATUS_LABELS = {
  pending: "Pending",
  completed: "Completed", 
  failed: "Failed",
  refunded: "Refunded",
};
