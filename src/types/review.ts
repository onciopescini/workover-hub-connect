
import { Database } from "@/integrations/supabase/types";

// Note: Legacy reviews table has been removed
// All review functionality now uses booking_reviews and event_reviews tables

// Nuovi tipi per le recensioni bidirezionali
export type BookingReview = Database["public"]["Tables"]["booking_reviews"]["Row"];
export type BookingReviewInsert = Database["public"]["Tables"]["booking_reviews"]["Insert"];
export type BookingReviewUpdate = Database["public"]["Tables"]["booking_reviews"]["Update"];

// Event reviews removed with events functionality

export type BookingReviewWithDetails = BookingReview & {
  author?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
  target?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
  booking?: {
    booking_date: string;
    space: {
      title: string;
      address: string;
    };
  } | null;
};

// Event review details removed with events functionality

// Legacy review details removed

export const RATING_LABELS = {
  1: "Poor",
  2: "Fair", 
  3: "Good",
  4: "Very Good",
  5: "Excellent"
};

export interface ReviewStatus {
  canWriteReview: boolean;
  hasWrittenReview: boolean;
  hasReceivedReview: boolean;
  isVisible: boolean;
  daysUntilVisible?: number;
}
