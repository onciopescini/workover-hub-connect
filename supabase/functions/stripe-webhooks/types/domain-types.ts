
export interface BookingDetails {
  id: string;
  status: string;
  space_id: string;
  user_id: string;
  workspaces: {
    id: string;
    confirmation_type: string;
    host_id: string;
    title: string;
  };
}

export interface HostProfile {
  stripe_account_id?: string;
  stripe_connected: boolean;
  first_name?: string;
  last_name?: string;
}

export interface PaymentBreakdown {
  totalAmount: number;
  platformFeeAmount: number;
  hostAmount: number;
  hostTransferAmount: number;
  platformTotalFee: number;
}

export interface NotificationData {
  user_id: string;
  type: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
}

export interface StripeOnboardingState {
  isVerified: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}
