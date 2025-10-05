import {
  ConnectionRequestSchema,
  ConnectionResponseSchema,
  ConnectionRemovalSchema,
  ProfileAccessSchema,
  SuggestionFeedbackSchema,
  NetworkingPreferencesSchema,
} from '@/schemas/connectionSchema';
import {
  createMockConnectionRequest,
  createMockConnectionResponse,
  createMockNetworkingPreferences,
  createInvalidUuid,
  createTooLongString,
} from '../factories/mockData';

describe('Connection Schemas', () => {
  describe('ConnectionRequestSchema', () => {
    it('should validate connection request with message', () => {
      const validData = createMockConnectionRequest();
      const result = ConnectionRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate connection request without message', () => {
      const data = createMockConnectionRequest({ message: undefined });
      const result = ConnectionRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should trim message whitespace', () => {
      const data = createMockConnectionRequest({
        message: '  Messaggio con spazi  ',
      });
      const result = ConnectionRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe('Messaggio con spazi');
      }
    });

    it('should reject invalid receiver_id', () => {
      const data = createMockConnectionRequest({
        receiver_id: createInvalidUuid(),
      });
      const result = ConnectionRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject message exceeding 500 characters', () => {
      const data = createMockConnectionRequest({
        message: createTooLongString(500),
      });
      const result = ConnectionRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('ConnectionResponseSchema', () => {
    it('should validate accepted response', () => {
      const validData = createMockConnectionResponse({ status: 'accepted' });
      const result = ConnectionResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate rejected response', () => {
      const validData = createMockConnectionResponse({ status: 'rejected' });
      const result = ConnectionResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate without response message', () => {
      const data = createMockConnectionResponse({
        response_message: undefined,
      });
      const result = ConnectionResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid connection_id', () => {
      const data = createMockConnectionResponse({
        connection_id: createInvalidUuid(),
      });
      const result = ConnectionResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const data = createMockConnectionResponse({ status: 'invalid' as any });
      const result = ConnectionResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('ConnectionRemovalSchema', () => {
    it('should validate connection removal with reason', () => {
      const validData = {
        connection_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: 'Non più interessato alla connessione',
      };
      const result = ConnectionRemovalSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate connection removal without reason', () => {
      const data = {
        connection_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = ConnectionRemovalSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding 500 characters', () => {
      const data = {
        connection_id: '123e4567-e89b-12d3-a456-426614174000',
        reason: createTooLongString(500),
      };
      const result = ConnectionRemovalSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('ProfileAccessSchema', () => {
    it('should validate profile access check', () => {
      const validData = {
        profile_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = ProfileAccessSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid profile_id', () => {
      const data = {
        profile_id: createInvalidUuid(),
      };
      const result = ProfileAccessSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('SuggestionFeedbackSchema', () => {
    it('should validate all feedback actions', () => {
      const actions = ['connect', 'dismiss', 'hide'] as const;
      actions.forEach(action => {
        const data = {
          suggestion_id: '123e4567-e89b-12d3-a456-426614174000',
          action,
        };
        const result = SuggestionFeedbackSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid action', () => {
      const data = {
        suggestion_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'invalid',
      };
      const result = SuggestionFeedbackSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('NetworkingPreferencesSchema', () => {
    it('should validate complete networking preferences', () => {
      const validData = createMockNetworkingPreferences();
      const result = NetworkingPreferencesSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const data = {
        networking_enabled: true,
      };
      const result = NetworkingPreferencesSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collaboration_availability).toBe('not_available');
        expect(result.data.collaboration_types).toEqual([]);
        expect(result.data.preferred_work_mode).toBe('flessibile');
      }
    });

    it('should validate all collaboration availability types', () => {
      const types = ['available', 'maybe', 'not_available'] as const;
      types.forEach(collaboration_availability => {
        const data = createMockNetworkingPreferences({
          collaboration_availability,
        });
        const result = NetworkingPreferencesSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all work modes', () => {
      const modes = ['remoto', 'ibrido', 'presenza', 'flessibile'] as const;
      modes.forEach(preferred_work_mode => {
        const data = createMockNetworkingPreferences({ preferred_work_mode });
        const result = NetworkingPreferencesSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all collaboration types', () => {
      const types = [
        'progetti',
        'consulenza',
        'partnership',
        'mentorship',
        'eventi',
        'altro',
      ];
      const data = createMockNetworkingPreferences({
        collaboration_types: types,
      });
      const result = NetworkingPreferencesSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject description exceeding 500 characters', () => {
      const data = createMockNetworkingPreferences({
        collaboration_description: createTooLongString(500),
      });
      const result = NetworkingPreferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
