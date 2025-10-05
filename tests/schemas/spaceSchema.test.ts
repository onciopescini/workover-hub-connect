import { SpaceFormSchema } from '@/schemas/spaceSchema';
import {
  createMockSpaceForm,
  createInvalidUuid,
  createTooLongString,
  createEmptyString,
  createInvalidUrl,
} from '../factories/mockData';

describe('SpaceFormSchema', () => {
  describe('Valid Data', () => {
    it('should validate a complete valid space form', () => {
      const validData = createMockSpaceForm();
      const result = SpaceFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const minimalData = createMockSpaceForm({
        workspace_features: [],
        amenities: [],
        seating_types: [],
        ideal_guest_tags: [],
        event_friendly_tags: [],
        rules: undefined,
        photos: [],
      });
      const result = SpaceFormSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should validate all category types', () => {
      const categories = ['home', 'outdoor', 'professional'] as const;
      categories.forEach(category => {
        const data = createMockSpaceForm({ category });
        const result = SpaceFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all work environment types', () => {
      const environments = ['silent', 'controlled', 'dynamic'] as const;
      environments.forEach(work_environment => {
        const data = createMockSpaceForm({ work_environment });
        const result = SpaceFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all confirmation types', () => {
      const types = ['instant', 'host_approval'] as const;
      types.forEach(confirmation_type => {
        const data = createMockSpaceForm({ confirmation_type });
        const result = SpaceFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invalid Data - Title', () => {
    it('should reject empty title', () => {
      const data = createMockSpaceForm({ title: createEmptyString() });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obbligatorio');
      }
    });

    it('should reject title exceeding 100 characters', () => {
      const data = createMockSpaceForm({ title: createTooLongString(100) });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100 caratteri');
      }
    });
  });

  describe('Invalid Data - Description', () => {
    it('should reject empty description', () => {
      const data = createMockSpaceForm({ description: createEmptyString() });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject description exceeding 1000 characters', () => {
      const data = createMockSpaceForm({ description: createTooLongString(1000) });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Data - Category', () => {
    it('should reject invalid category', () => {
      const data = createMockSpaceForm({ category: 'invalid' });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Data - Capacity', () => {
    it('should reject capacity less than 1', () => {
      const data = createMockSpaceForm({ max_capacity: 0 });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject capacity greater than 100', () => {
      const data = createMockSpaceForm({ max_capacity: 101 });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Data - Address', () => {
    it('should reject empty address', () => {
      const data = createMockSpaceForm({ address: createEmptyString() });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Data - Pricing', () => {
    it('should reject negative price per hour', () => {
      const data = createMockSpaceForm({ price_per_hour: -10 });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject negative price per day', () => {
      const data = createMockSpaceForm({ price_per_day: -100 });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid Data - Availability', () => {
    it('should reject invalid time format in slots', () => {
      const data = createMockSpaceForm({
        availability: {
          recurring: {
            monday: { enabled: true, slots: [{ start: '25:00', end: '18:00' }] },
            tuesday: { enabled: false, slots: [] },
            wednesday: { enabled: false, slots: [] },
            thursday: { enabled: false, slots: [] },
            friday: { enabled: false, slots: [] },
            saturday: { enabled: false, slots: [] },
            sunday: { enabled: false, slots: [] },
          },
          exceptions: [],
        },
      });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing enabled field in day availability', () => {
      const data = createMockSpaceForm({
        availability: {
          recurring: {
            monday: { slots: [] } as any, // Missing enabled
            tuesday: { enabled: false, slots: [] },
            wednesday: { enabled: false, slots: [] },
            thursday: { enabled: false, slots: [] },
            friday: { enabled: false, slots: [] },
            saturday: { enabled: false, slots: [] },
            sunday: { enabled: false, slots: [] },
          },
          exceptions: [],
        },
      });
      const result = SpaceFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
