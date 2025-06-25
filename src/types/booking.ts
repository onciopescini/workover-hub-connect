import { Database } from "@/integrations/supabase/types";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

export type BookingWithDetails = {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time?: string;
  end_time?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
  cancellation_fee?: number | null;
  cancelled_by_host?: boolean | null;
  cancellation_reason?: string | null;
  slot_reserved_until?: string | null;
  payment_required?: boolean | null;
  payment_session_id?: string | null;
  reservation_token?: string | null;
  space: {
    id: string;
    title: string;
    address: string;
    photos: string[];
    host_id: string;
    price_per_day?: number;
    confirmation_type?: string;
  };
  coworker?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
  payments?: Array<{
    id: string;
    payment_status: string;
    amount: number;
    created_at: string;
  }>;
};

// Raw booking data from database
export type RawBookingData = {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
  cancellation_fee?: number | null;
  cancelled_by_host?: boolean | null;
  cancellation_reason?: string | null;
  slot_reserved_until?: string | null;
  payment_required?: boolean | null;
  payment_session_id?: string | null;
  reservation_token?: string | null;
};

// Reservation result type
export interface SlotReservationResult {
  success: boolean;
  error?: string;
  booking_id?: string;
  reservation_token?: string;
  reserved_until?: string;
  space_title?: string;
  confirmation_type?: string;
}

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
  pending: "In attesa",
  confirmed: "Confermata", 
  cancelled: "Annullata",
};
