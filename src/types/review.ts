
import { Database } from "@/integrations/supabase/types";

// Booking review types
export type BookingReview = Database["public"]["Tables"]["booking_reviews"]["Row"];
export type BookingReviewInsert = Database["public"]["Tables"]["booking_reviews"]["Insert"];
export type BookingReviewUpdate = Database["public"]["Tables"]["booking_reviews"]["Update"];

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
