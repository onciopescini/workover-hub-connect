
import { Database } from "@/integrations/supabase/types";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

export type BookingWithDetails = Booking & {
  space: {
    title: string;
    address: string;
    photos: string[];
    host_id: string;
    price_per_day?: number;
  };
  coworker?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
};

// Message type definition to match our database schema
export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  attachments: string[];
  is_read: boolean;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
};

// Interface for the cancel_booking RPC response
export interface CancelBookingResponse {
  success: boolean;
  error?: string;
  booking_id?: string;
  cancellation_fee?: number;
}

export const BOOKING_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const BOOKING_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
