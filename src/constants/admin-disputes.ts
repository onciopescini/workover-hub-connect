import type { Database } from '@/integrations/supabase/types';

export const ADMIN_DISPUTES_QUERY_KEY = ['admin', 'disputes'] as const;

export const DISPUTE_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const satisfies Record<string, Database['public']['Tables']['disputes']['Row']['status']>;

export const DISPUTE_OPEN_STATUSES = [DISPUTE_STATUS.OPEN] as const;

export const BOOKING_RESOLUTION_STATUS = {
  REFUNDED: 'refunded',
  CHECKED_OUT: 'checked_out',
} as const satisfies Record<string, NonNullable<Database['public']['Tables']['bookings']['Row']['status']>>;

export const DISPUTE_REASON_PREVIEW_LENGTH = 120;
