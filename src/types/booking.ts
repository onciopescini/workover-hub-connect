import { Database } from "@/integrations/supabase/types";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export interface BookingSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hasConflict?: boolean;
  conflictMessage?: string;
  suggestions?: string[];
}

export interface MultiDayBookingData {
  slots: BookingSlot[];
  totalPrice: number;
  totalHours: number;
}

export interface CoworkerFiscalData {
  tax_id: string;
  is_business: boolean;
  pec_email: string;
  sdi_code: string;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
}

export interface SlotReservationResult {
  success: boolean;
  error?: string;
  booking_id?: string;
  reservation_token?: string;
  reserved_until?: string;
  space_title?: string;
  confirmation_type?: string;
}

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  pending_approval: "bg-orange-100 text-orange-800",
  pending_payment: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  served: "bg-purple-100 text-purple-800",
  refunded: "bg-cyan-100 text-cyan-800",
  disputed: "bg-rose-100 text-rose-800",
  frozen: "bg-gray-100 text-gray-800",
  checked_in: "bg-emerald-100 text-emerald-800",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "In attesa",
  pending_approval: "In attesa di approvazione",
  pending_payment: "In attesa di pagamento",
  confirmed: "Confermata",
  cancelled: "Annullata",
  served: "Servizio completato",
  refunded: "Rimborsata",
  disputed: "Contestata",
  frozen: "Sospesa",
  checked_in: "Check-in effettuato",
};

export type BookingWithDetails = {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'pending_approval' | 'pending_payment' | 'served' | 'refunded' | 'disputed' | 'frozen' | 'checked_in';
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
  cancellation_fee?: number | null;
  cancellation_policy?: string | null;
  cancelled_by_host?: boolean | null;
  cancellation_reason?: string | null;
  slot_reserved_until?: string | null;
  payment_required?: boolean | null;
  payment_session_id?: string | null;
  reservation_token?: string | null;
  approval_deadline?: string | null;
  payment_deadline?: string | null;
  is_urgent?: boolean | null;
  approval_reminder_sent?: boolean | null;
  payment_reminder_sent?: boolean | null;
  service_completed_at?: string | null;
  space: {
    id: string;
    title: string;
    address: string;
    image_url?: string;
    photos?: string[];
    type?: string;
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
  cancellation_policy?: string | null;
  cancelled_by_host?: boolean | null;
  cancellation_reason?: string | null;
  slot_reserved_until?: string | null;
  payment_required?: boolean | null;
  payment_session_id?: string | null;
  reservation_token?: string | null;
  fiscal_data?: any; // JSONB
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
