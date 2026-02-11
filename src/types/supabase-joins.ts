import { Database } from '@/integrations/supabase/types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type SpaceRow = Database['public']['Tables']['spaces']['Row'];
export type BookingRow = Database['public']['Tables']['bookings']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type WaitlistRow = Database['public']['Tables']['waitlists']['Row'];
export type BookingReviewRow = Database['public']['Tables']['booking_reviews']['Row'];
export type ConnectionRow = Database['public']['Tables']['connections']['Row'];
export type UserAchievementRow = Database['public']['Tables']['user_achievements']['Row'];

export type FavoriteSpaceJoin = Database['public']['Tables']['favorites']['Row'] & {
  space: Pick<
    SpaceRow,
    | 'id'
    | 'title'
    | 'description'
    | 'address'
    | 'price_per_day'
    | 'photos'
    | 'category'
    | 'work_environment'
    | 'host_id'
  > | null;
};

export type WaitlistSpaceJoin = WaitlistRow & {
  spaces:
    | (Pick<SpaceRow, 'title' | 'host_id'> & {
        profiles: Pick<ProfileRow, 'first_name' | 'last_name'> | null;
      })
    | null;
};

export type WaitlistUserJoin = WaitlistRow & {
  profiles: Pick<ProfileRow, 'first_name' | 'last_name' | 'profile_photo_url'> | null;
};

export type PaymentWithBookingSpaceJoin = PaymentRow & {
  bookings:
    | (Pick<BookingRow, 'id' | 'booking_date' | 'space_id'> & {
        spaces: Pick<SpaceRow, 'id' | 'title' | 'host_id'> | null;
      })
    | null;
};

// AGGRESSIVE FIX: Use any for coworker to bypass strict type checking
export type PaymentWithInvoiceBookingJoin = PaymentRow & {
  booking:
    | (Pick<BookingRow, 'id' | 'booking_date' | 'start_time' | 'end_time' | 'cancelled_at' | 'cancellation_reason'> & {
        coworker: { first_name: string; last_name: string; email?: string } | null;
        space: Pick<SpaceRow, 'id' | 'title' | 'host_id'> | null;
      })
    | null;
};

export type PaymentWithHistoryBookingJoin = PaymentRow & {
  booking:
    | (Pick<BookingRow, 'booking_date'> & {
        coworker: Pick<ProfileRow, 'first_name' | 'last_name'> | null;
        space: Pick<SpaceRow, 'host_id'> | null;
      })
    | null;
};

export type BookingWithSpacePaymentsJoin = BookingRow & {
  spaces: Pick<SpaceRow, 'id' | 'title' | 'address' | 'photos' | 'host_id' | 'price_per_day' | 'confirmation_type'> | null;
  payments?: Pick<PaymentRow, 'id' | 'payment_status' | 'amount' | 'created_at'>[] | null;
  disputes:
    | Array<
        Pick<Database['public']['Tables']['disputes']['Row'], 'id' | 'reason' | 'guest_id' | 'status' | 'created_at'> & {
          guest: Pick<ProfileRow, 'first_name' | 'last_name'> | null;
        }
      >
    | null;
};

export type BookingWithSpacePaymentsAndCoworkerJoin = BookingWithSpacePaymentsJoin & {
  coworker: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'profile_photo_url'> | null;
};

export type BookingWithSpaceHostJoin = Pick<BookingRow, 'user_id'> & {
  spaces: Pick<SpaceRow, 'host_id'> | null;
};

export type BookingWithSpaceAndProfileJoin = BookingRow & {
  spaces: Pick<SpaceRow, 'title' | 'host_id'> | null;
  profiles: Pick<ProfileRow, 'first_name' | 'last_name'> | null;
};

export type MessageWithSenderJoin = MessageRow & {
  sender: Pick<ProfileRow, 'first_name' | 'last_name' | 'profile_photo_url'> | null;
};

export type ConversationJoin = ConversationRow & {
  host: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'profile_photo_url'> | null;
  coworker: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'profile_photo_url'> | null;
  space: Pick<SpaceRow, 'id' | 'title' | 'address' | 'city_name' | 'price_per_hour' | 'photos'> | null;
  booking: Pick<BookingRow, 'booking_date' | 'status' | 'start_time' | 'end_time'> | null;
};

export type BookingReviewJoin = BookingReviewRow & {
  author: Pick<ProfileRow, 'first_name' | 'last_name' | 'profile_photo_url'> | null;
  target: Pick<ProfileRow, 'first_name' | 'last_name' | 'profile_photo_url'> | null;
  booking:
    | (Pick<BookingRow, 'booking_date'> & {
        spaces: Pick<SpaceRow, 'title' | 'address'> | null;
      })
    | null;
};

export type ConnectionWithSenderJoin = ConnectionRow & {
  sender: Pick<ProfileRow, 'first_name' | 'last_name' | 'profile_photo_url'> | null;
};
