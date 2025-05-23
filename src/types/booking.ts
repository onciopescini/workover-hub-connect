
import { Database } from "@/integrations/supabase/types";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

export type BookingWithDetails = Booking & {
  space: {
    title: string;
    address: string;
    photos: string[];
  };
  coworker?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
};

// Add the type for messages related to bookings
export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  is_read: boolean;
  read_at: string | null;
  sent_email: boolean;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
};

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
