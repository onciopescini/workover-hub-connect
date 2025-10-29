import { Database } from "@/integrations/supabase/types";

// Space review types (COWORKER → SPACE)
export type SpaceReview = {
  id: string;
  booking_id: string;
  space_id: string;
  author_id: string;
  rating: number;
  content: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type SpaceReviewInsert = {
  booking_id: string;
  space_id: string;
  author_id: string;
  rating: number;
  content?: string | null;
};

export type SpaceReviewWithDetails = SpaceReview & {
  author_first_name: string;
  author_last_name: string;
  author_profile_photo_url: string | null;
  booking_date: string;
};

export interface SpaceReviewStatus {
  canWriteReview: boolean;
  hasWrittenReview: boolean;
  isVisible: boolean;
  daysUntilVisible: number;
}

export interface SpaceReviewsStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}
