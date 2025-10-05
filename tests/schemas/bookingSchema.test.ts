import {
  BookingFormSchema,
  BookingSlotSchema,
  MultiDayBookingSchema,
  BookingCancellationSchema,
  SlotReservationSchema,
  BookingStatusUpdateSchema,
} from '@/schemas/bookingSchema';
import {
  createMockBookingForm,
  createMockBookingSlot,
  createMockBookingCancellation,
  createInvalidUuid,
  createInvalidDate,
  createInvalidTime,
  createTooLongString,
} from '../factories/mockData';

describe('Booking Schemas', () => {
  describe('BookingSlotSchema', () => {
    it('should validate valid booking slot', () => {
      const validSlot = createMockBookingSlot();
      const result = BookingSlotSchema.safeParse(validSlot);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const slot = createMockBookingSlot({ id: createInvalidUuid() });
      const result = BookingSlotSchema.safeParse(slot);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const slot = createMockBookingSlot({ date: createInvalidDate() });
      const result = BookingSlotSchema.safeParse(slot);
      expect(result.success).toBe(false);
    });

    it('should reject invalid time format', () => {
      const slot = createMockBookingSlot({ startTime: createInvalidTime() });
      const result = BookingSlotSchema.safeParse(slot);
      expect(result.success).toBe(false);
    });
  });

  describe('MultiDayBookingSchema', () => {
    it('should validate valid multi-day booking', () => {
      const validData = {
        slots: [createMockBookingSlot()],
        totalPrice: 150,
        totalHours: 5,
      };
      const result = MultiDayBookingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty slots array', () => {
      const data = { slots: [], totalPrice: 0, totalHours: 0 };
      const result = MultiDayBookingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const data = {
        slots: [createMockBookingSlot()],
        totalPrice: -10,
        totalHours: 2,
      };
      const result = MultiDayBookingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject hours less than 0.5', () => {
      const data = {
        slots: [createMockBookingSlot()],
        totalPrice: 10,
        totalHours: 0.25,
      };
      const result = MultiDayBookingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('BookingFormSchema', () => {
    it('should validate complete booking form', () => {
      const validData = createMockBookingForm();
      const result = BookingFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate booking without time (all-day booking)', () => {
      const data = createMockBookingForm({
        start_time: undefined,
        end_time: undefined,
      });
      const result = BookingFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid space_id UUID', () => {
      const data = createMockBookingForm({ space_id: createInvalidUuid() });
      const result = BookingFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid booking date format', () => {
      const data = createMockBookingForm({ booking_date: '01-12-2025' });
      const result = BookingFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject end_time before start_time', () => {
      const data = createMockBookingForm({
        start_time: '18:00',
        end_time: '09:00',
      });
      const result = BookingFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('end_time');
      }
    });

    it('should reject guests_count less than 1', () => {
      const data = createMockBookingForm({ guests_count: 0 });
      const result = BookingFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject guests_count greater than 100', () => {
      const data = createMockBookingForm({ guests_count: 101 });
      const result = BookingFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('BookingCancellationSchema', () => {
    it('should validate cancellation with reason', () => {
      const validData = createMockBookingCancellation();
      const result = BookingCancellationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate cancellation without reason', () => {
      const data = createMockBookingCancellation({
        cancellation_reason: undefined,
      });
      const result = BookingCancellationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid booking_id', () => {
      const data = createMockBookingCancellation({
        booking_id: createInvalidUuid(),
      });
      const result = BookingCancellationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject cancellation reason too short', () => {
      const data = createMockBookingCancellation({
        cancellation_reason: 'troppo',
      });
      const result = BookingCancellationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject cancellation reason too long', () => {
      const data = createMockBookingCancellation({
        cancellation_reason: createTooLongString(500),
      });
      const result = BookingCancellationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('SlotReservationSchema', () => {
    it('should validate valid slot reservation', () => {
      const validData = {
        space_id: '123e4567-e89b-12d3-a456-426614174000',
        booking_date: '2025-12-01',
        start_time: '09:00',
        end_time: '12:00',
        guests_count: 2,
      };
      const result = SlotReservationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default guests_count of 1', () => {
      const data = {
        space_id: '123e4567-e89b-12d3-a456-426614174000',
        booking_date: '2025-12-01',
        start_time: '09:00',
        end_time: '12:00',
      };
      const result = SlotReservationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.guests_count).toBe(1);
      }
    });
  });

  describe('BookingStatusUpdateSchema', () => {
    it('should validate all status types', () => {
      const statuses = ['pending', 'confirmed', 'cancelled'] as const;
      statuses.forEach(status => {
        const data = {
          booking_id: '123e4567-e89b-12d3-a456-426614174000',
          status,
        };
        const result = BookingStatusUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const data = {
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'invalid',
      };
      const result = BookingStatusUpdateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
