// CRITICAL: KEEP IN SYNC WITH src/lib/policy-calculator.ts

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export interface RefundCalculationResult {
  refundAmount: number;
  penaltyAmount: number;
  penaltyPercentage: number;
}

/**
 * Calculates the refund and penalty for a booking cancellation based on the policy.
 *
 * @param totalAmount The total amount paid for the booking (should be in cents if using Stripe)
 * @param policy The cancellation policy ('flexible', 'moderate', 'strict')
 * @param bookingStart The start date of the booking (JS Date object)
 * @param cancellationTime The time of cancellation (JS Date object, defaults to now)
 * @returns RefundCalculationResult
 */
export function calculateRefund(
  totalAmount: number,
  policy: string,
  bookingStart: Date,
  cancellationTime: Date = new Date()
): RefundCalculationResult {
  // Normalize policy string
  const normalizedPolicy = (policy?.toLowerCase() || 'moderate') as CancellationPolicy;

  // Calculate time difference in hours
  const diffMs = bookingStart.getTime() - cancellationTime.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);
  const daysRemaining = hoursRemaining / 24;

  let refundPercentage = 0;

  // If the booking has already started (or is in the past), no refund.
  if (hoursRemaining <= 0) {
    refundPercentage = 0;
  } else {
    switch (normalizedPolicy) {
      case 'flexible':
        // FLEXIBLE: >24h = 100% Refund; <24h = 0% Refund.
        if (hoursRemaining >= 24) {
          refundPercentage = 1.0;
        } else {
          refundPercentage = 0.0;
        }
        break;

      case 'moderate':
        // MODERATE: >5 days = 100%; 5d-24h = 50%; <24h = 0%.
        if (daysRemaining >= 5) {
          refundPercentage = 1.0;
        } else if (hoursRemaining >= 24) {
          refundPercentage = 0.5;
        } else {
          refundPercentage = 0.0;
        }
        break;

      case 'strict':
        // STRICT: >7 days = 50%; <7 days = 0%.
        if (daysRemaining >= 7) {
          refundPercentage = 0.5;
        } else {
          refundPercentage = 0.0;
        }
        break;

      default:
        // Default to moderate fallback if unknown
        if (daysRemaining >= 5) {
          refundPercentage = 1.0;
        } else if (hoursRemaining >= 24) {
          refundPercentage = 0.5;
        } else {
          refundPercentage = 0.0;
        }
        break;
    }
  }

  // Calculate amounts with strict integer rounding for financial precision
  const refundAmount = Math.round(totalAmount * refundPercentage);
  const penaltyAmount = totalAmount - refundAmount;
  const penaltyPercentage = (1 - refundPercentage) * 100;

  return {
    refundAmount,
    penaltyAmount,
    penaltyPercentage
  };
}
