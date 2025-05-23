
import { Database } from "@/integrations/supabase/types";

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

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
