
import { Database } from "@/integrations/supabase/types";

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

// Nuovi tipi per le recensioni bidirezionali
export type BookingReview = Database["public"]["Tables"]["booking_reviews"]["Row"];
export type BookingReviewInsert = Database["public"]["Tables"]["booking_reviews"]["Insert"];
export type BookingReviewUpdate = Database["public"]["Tables"]["booking_reviews"]["Update"];

export type EventReview = Database["public"]["Tables"]["event_reviews"]["Row"];
export type EventReviewInsert = Database["public"]["Tables"]["event_reviews"]["Insert"];
export type EventReviewUpdate = Database["public"]["Tables"]["event_reviews"]["Update"];

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

export type EventReviewWithDetails = EventReview & {
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
  event?: {
    title: string;
    date: string;
  } | null;
};

export type ReviewWithDetails = Review & {
  reviewer?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
  reviewee?: {
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
