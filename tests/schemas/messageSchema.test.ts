import {
  MessageFormSchema,
  MessageUpdateSchema,
  BulkMessageReadSchema,
  MessageTemplateSchema,
  PrivateChatSchema,
} from '@/schemas/messageSchema';
import {
  createMockMessageForm,
  createMockMessageAttachment,
  createMockMessageTemplate,
  createInvalidUuid,
  createInvalidUrl,
  createTooLongString,
  createEmptyString,
} from '../factories/mockData';

describe('Message Schemas', () => {
  describe('MessageFormSchema', () => {
    it('should validate message with booking_id', () => {
      const validData = createMockMessageForm();
      const result = MessageFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate message with conversation_id', () => {
      const data = createMockMessageForm({
        booking_id: undefined,
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate message with attachments', () => {
      const data = createMockMessageForm({
        attachments: [
          createMockMessageAttachment(),
          createMockMessageAttachment({ type: 'image' }),
        ],
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const data = createMockMessageForm({ content: createEmptyString() });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding 2000 characters', () => {
      const data = createMockMessageForm({
        content: createTooLongString(2000),
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject message without booking_id or conversation_id', () => {
      const data = createMockMessageForm({
        booking_id: undefined,
        conversation_id: undefined,
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('booking_id o conversation_id');
      }
    });

    it('should reject more than 5 attachments', () => {
      const data = createMockMessageForm({
        attachments: Array(6).fill(createMockMessageAttachment()),
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject attachment with invalid URL', () => {
      const data = createMockMessageForm({
        attachments: [createMockMessageAttachment({ url: createInvalidUrl() })],
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject attachment exceeding 10MB', () => {
      const data = createMockMessageForm({
        attachments: [
          createMockMessageAttachment({ size: 11 * 1024 * 1024 }),
        ],
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject attachment with invalid type', () => {
      const data = createMockMessageForm({
        attachments: [createMockMessageAttachment({ type: 'invalid' as any })],
      });
      const result = MessageFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('MessageUpdateSchema', () => {
    it('should validate message update', () => {
      const validData = {
        message_id: '123e4567-e89b-12d3-a456-426614174000',
        is_read: true,
      };
      const result = MessageUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid message_id', () => {
      const data = {
        message_id: createInvalidUuid(),
        is_read: true,
      };
      const result = MessageUpdateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('BulkMessageReadSchema', () => {
    it('should validate bulk read with multiple message IDs', () => {
      const validData = {
        message_ids: [
          '123e4567-e89b-12d3-a456-426614174000',
          '223e4567-e89b-12d3-a456-426614174000',
        ],
        is_read: true,
      };
      const result = BulkMessageReadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default is_read value of true', () => {
      const data = {
        message_ids: ['123e4567-e89b-12d3-a456-426614174000'],
      };
      const result = BulkMessageReadSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_read).toBe(true);
      }
    });

    it('should reject empty message_ids array', () => {
      const data = {
        message_ids: [],
        is_read: true,
      };
      const result = BulkMessageReadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in array', () => {
      const data = {
        message_ids: ['123e4567-e89b-12d3-a456-426614174000', createInvalidUuid()],
        is_read: true,
      };
      const result = BulkMessageReadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('MessageTemplateSchema', () => {
    it('should validate all template types', () => {
      const types = ['confirmation', 'reminder', 'cancellation', 'welcome', 'custom'] as const;
      types.forEach(type => {
        const data = createMockMessageTemplate({ type });
        const result = MessageTemplateSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should use default values for is_active and is_favorite', () => {
      const data = {
        name: 'Template',
        content: 'Contenuto del template con almeno 10 caratteri',
        type: 'custom' as const,
      };
      const result = MessageTemplateSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(true);
        expect(result.data.is_favorite).toBe(false);
      }
    });

    it('should reject empty name', () => {
      const data = createMockMessageTemplate({ name: createEmptyString() });
      const result = MessageTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name exceeding 100 characters', () => {
      const data = createMockMessageTemplate({ name: createTooLongString(100) });
      const result = MessageTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject content too short', () => {
      const data = createMockMessageTemplate({ content: 'Troppo' });
      const result = MessageTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding 2000 characters', () => {
      const data = createMockMessageTemplate({
        content: createTooLongString(2000),
      });
      const result = MessageTemplateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('PrivateChatSchema', () => {
    it('should validate private chat creation', () => {
      const validData = {
        participant_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = PrivateChatSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid participant_id', () => {
      const data = {
        participant_id: createInvalidUuid(),
      };
      const result = PrivateChatSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
