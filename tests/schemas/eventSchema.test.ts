import {
  EventFormSchema,
  EventUpdateSchema,
  EventParticipationSchema,
  EventCancellationSchema,
  WaitlistJoinSchema,
  EventLeaveSchema,
  EventFilterSchema,
  EventStatsQuerySchema,
} from '@/schemas/eventSchema';
import {
  createMockEventForm,
  createMockEventCancellation,
  createInvalidUuid,
  createInvalidDate,
  createInvalidTime,
  createInvalidUrl,
  createTooLongString,
  createEmptyString,
} from '../factories/mockData';

describe('Event Schemas', () => {
  describe('EventFormSchema', () => {
    it('should validate complete event form', () => {
      const validData = createMockEventForm();
      const result = EventFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate event with minimal participants', () => {
      const data = createMockEventForm({
        max_participants: 100,
        min_participants: 1,
      });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const data = createMockEventForm({ title: createEmptyString() });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 characters', () => {
      const data = createMockEventForm({ title: createTooLongString(200) });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject description too short', () => {
      const data = createMockEventForm({ description: 'Troppo' });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid space_id UUID', () => {
      const data = createMockEventForm({ space_id: createInvalidUuid() });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid event date format', () => {
      const data = createMockEventForm({ event_date: createInvalidDate() });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject end_time before start_time', () => {
      const data = createMockEventForm({
        start_time: '18:00',
        end_time: '14:00',
      });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject max_participants less than min_participants', () => {
      const data = createMockEventForm({
        max_participants: 10,
        min_participants: 20,
      });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('massimo');
      }
    });

    it('should reject past event date', () => {
      const data = createMockEventForm({ event_date: '2020-01-01' });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('futuro');
      }
    });

    it('should validate all event statuses', () => {
      const statuses = ['active', 'cancelled', 'completed', 'draft'] as const;
      statuses.forEach(event_status => {
        const data = createMockEventForm({ event_status });
        const result = EventFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid image URL', () => {
      const data = createMockEventForm({ image_url: createInvalidUrl() });
      const result = EventFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('EventUpdateSchema', () => {
    it('should validate partial event update', () => {
      const data = {
        title: 'Nuovo Titolo',
        max_participants: 30,
      };
      const result = EventUpdateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate updating only description', () => {
      const data = {
        description: 'Nuova descrizione aggiornata con più dettagli',
      };
      const result = EventUpdateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid values in update', () => {
      const data = {
        max_participants: 0,
      };
      const result = EventUpdateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject end_time before start_time in update', () => {
      const data = {
        start_time: '18:00',
        end_time: '14:00',
      };
      const result = EventUpdateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('EventParticipationSchema', () => {
    it('should validate event participation', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = EventParticipationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid event_id', () => {
      const data = {
        event_id: createInvalidUuid(),
      };
      const result = EventParticipationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('EventCancellationSchema', () => {
    it('should validate event cancellation', () => {
      const validData = createMockEventCancellation();
      const result = EventCancellationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject cancellation reason too short', () => {
      const data = createMockEventCancellation({
        cancellation_reason: 'Breve',
      });
      const result = EventCancellationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject cancellation reason too long', () => {
      const data = createMockEventCancellation({
        cancellation_reason: createTooLongString(1000),
      });
      const result = EventCancellationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('WaitlistJoinSchema', () => {
    it('should validate joining waitlist with notification', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
        notify_on_availability: true,
      };
      const result = WaitlistJoinSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use default notification preference', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = WaitlistJoinSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notify_on_availability).toBe(true);
      }
    });
  });

  describe('EventLeaveSchema', () => {
    it('should validate leaving event with reason', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
        leave_reason: 'Non posso più partecipare',
      };
      const result = EventLeaveSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate leaving event without reason', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = EventLeaveSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject leave_reason exceeding 500 characters', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
        leave_reason: createTooLongString(500),
      };
      const result = EventLeaveSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('EventFilterSchema', () => {
    it('should validate complete filter', () => {
      const data = {
        city: 'Milano',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
        status: 'active' as const,
        space_id: '123e4567-e89b-12d3-a456-426614174000',
        created_by: '223e4567-e89b-12d3-a456-426614174000',
        only_available: true,
        page: 1,
        limit: 20,
      };
      const result = EventFilterSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use default pagination values', () => {
      const data = {};
      const result = EventFilterSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should validate all status filters', () => {
      const statuses = ['active', 'cancelled', 'completed', 'draft'] as const;
      statuses.forEach(status => {
        const data = { status };
        const result = EventFilterSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject page less than 1', () => {
      const data = { page: 0 };
      const result = EventFilterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const data = { limit: 101 };
      const result = EventFilterSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('EventStatsQuerySchema', () => {
    it('should validate stats query with all flags', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
        include_participants: true,
        include_waitlist: true,
      };
      const result = EventStatsQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use default flag values', () => {
      const data = {
        event_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = EventStatsQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_participants).toBe(false);
        expect(result.data.include_waitlist).toBe(false);
      }
    });
  });
});
