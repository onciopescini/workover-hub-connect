import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { addBookingReview, getBookingReviewStatus } from '@/lib/booking-review-utils';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Review Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Review Eligibility', () => {
    it('should allow review after 24h from booking end_time', async () => {
      const bookingId = 'booking-123';
      const userId = 'user-123';
      const targetId = 'host-123';

      // Mock booking completato 25 ore fa
      const mockBooking = {
        id: bookingId,
        user_id: userId,
        status: 'served',
        booking_date: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_time: new Date(Date.now() - 25 * 60 * 60 * 1000).toTimeString().split(' ')[0],
        payment: { payment_status: 'completed' },
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
        }),
      });

      const status = await getBookingReviewStatus(bookingId, userId, targetId);

      expect(status.canWriteReview).toBe(true);
    });

    it('should NOT allow review before 24h from booking end_time', async () => {
      const bookingId = 'booking-123';
      const userId = 'user-123';
      const targetId = 'host-123';

      // Mock booking completato 12 ore fa
      const mockBooking = {
        id: bookingId,
        user_id: userId,
        status: 'served',
        booking_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_time: new Date(Date.now() - 12 * 60 * 60 * 1000).toTimeString().split(' ')[0],
        payment: { payment_status: 'completed' },
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
        }),
      });

      const status = await getBookingReviewStatus(bookingId, userId, targetId);

      expect(status.canWriteReview).toBe(false);
    });

    it('should NOT allow review after 14 days from booking end_time', async () => {
      const bookingId = 'booking-123';
      const userId = 'user-123';
      const targetId = 'host-123';

      // Mock booking completato 15 giorni fa
      const mockBooking = {
        id: bookingId,
        user_id: userId,
        status: 'served',
        booking_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0],
        payment: { payment_status: 'completed' },
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
        }),
      });

      const status = await getBookingReviewStatus(bookingId, userId, targetId);

      expect(status.canWriteReview).toBe(false);
    });

    it('should NOT allow review if booking not served', async () => {
      const bookingId = 'booking-123';
      const userId = 'user-123';
      const targetId = 'host-123';

      const mockBooking = {
        id: bookingId,
        user_id: userId,
        status: 'confirmed', // Non 'served'
        booking_date: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_time: new Date(Date.now() - 25 * 60 * 60 * 1000).toTimeString().split(' ')[0],
        payment: { payment_status: 'completed' },
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
        }),
      });

      const status = await getBookingReviewStatus(bookingId, userId, targetId);

      expect(status.canWriteReview).toBe(false);
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate reviews (client-side check)', async () => {
      const review = {
        booking_id: 'booking-123',
        author_id: 'user-123',
        target_id: 'host-123',
        rating: 5,
        content: 'Great experience',
      };

      // Mock existing review found
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'existing-review-123' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Mock rate limit check
      (supabase.rpc as any).mockResolvedValue({
        data: { allowed: true },
        error: null,
      });

      const result = await addBookingReview(review);

      expect(result).toBe(false);
    });

    it('should allow review if no duplicate exists', async () => {
      const review = {
        booking_id: 'booking-123',
        author_id: 'user-123',
        target_id: 'host-123',
        rating: 5,
        content: 'Great experience',
      };

      // Mock no existing review
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: { id: 'new-review-123' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFrom);

      // Mock rate limit check
      (supabase.rpc as any).mockResolvedValue({
        data: { allowed: true },
        error: null,
      });

      const result = await addBookingReview(review);

      expect(result).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should block review if rate limit exceeded', async () => {
      const review = {
        booking_id: 'booking-123',
        author_id: 'user-123',
        target_id: 'host-123',
        rating: 5,
        content: 'Great experience',
      };

      // Mock rate limit exceeded
      (supabase.rpc as any).mockResolvedValue({
        data: { allowed: false },
        error: null,
      });

      const result = await addBookingReview(review);

      expect(result).toBe(false);
    });

    it('should allow review if rate limit not exceeded', async () => {
      const review = {
        booking_id: 'booking-123',
        author_id: 'user-123',
        target_id: 'host-123',
        rating: 5,
        content: 'Great experience',
      };

      // Mock rate limit OK
      (supabase.rpc as any).mockResolvedValue({
        data: { allowed: true },
        error: null,
      });

      // Mock no duplicate
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: { id: 'new-review-123' },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFrom);

      const result = await addBookingReview(review);

      expect(result).toBe(true);
    });
  });

  describe('Mutual Review Visibility', () => {
    it('should show review immediately if both parties reviewed', async () => {
      const bookingId = 'booking-123';
      const userId = 'user-123';
      const targetId = 'host-123';

      // Mock recensione già ricevuta
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'received-review-123', is_visible: true }],
            error: null,
          }),
        }),
      });

      const status = await getBookingReviewStatus(bookingId, userId, targetId);

      expect(status.hasReceivedReview).toBe(true);
      expect(status.isVisible).toBe(true);
    });

    it('should hide review if other party has not reviewed yet', async () => {
      const bookingId = 'booking-123';
      const userId = 'user-123';
      const targetId = 'host-123';

      // Mock nessuna recensione ricevuta
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const status = await getBookingReviewStatus(bookingId, userId, targetId);

      expect(status.hasReceivedReview).toBe(false);
      expect(status.isVisible).toBe(false);
    });
  });
});
