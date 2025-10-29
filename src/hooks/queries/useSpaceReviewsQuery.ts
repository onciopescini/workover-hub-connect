import { useQuery } from '@tanstack/react-query';
import { getSpaceReviews, getSpaceWeightedRating } from '@/lib/space-review-service';
import { TIME_CONSTANTS } from "@/constants";

export const useSpaceReviewsQuery = (spaceId: string) => {
  return useQuery({
    queryKey: ['space-reviews', spaceId],
    queryFn: () => getSpaceReviews(spaceId),
    enabled: !!spaceId,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });
};

export const useSpaceWeightedRatingQuery = (spaceId: string) => {
  return useQuery({
    queryKey: ['space-weighted-rating', spaceId],
    queryFn: () => getSpaceWeightedRating(spaceId),
    enabled: !!spaceId,
    staleTime: TIME_CONSTANTS.CACHE_DURATION,
  });
};

export const useSpaceReviewsWithRating = (spaceId: string) => {
  const reviewsQuery = useSpaceReviewsQuery(spaceId);
  const ratingQuery = useSpaceWeightedRatingQuery(spaceId);

  return {
    reviews: reviewsQuery.data || [],
    weightedRating: ratingQuery.data || 0,
    isLoading: reviewsQuery.isLoading || ratingQuery.isLoading,
    error: reviewsQuery.error || ratingQuery.error,
    refetch: () => {
      reviewsQuery.refetch();
      ratingQuery.refetch();
    }
  };
};
