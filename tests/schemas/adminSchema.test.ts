import {
  ReportReviewSchema,
  UserSuspensionSchema,
  UserReactivationSchema,
  SpaceSuspensionSchema,
  SpaceModerationSchema,
  SpaceRevisionReviewSchema,
  TagApprovalSchema,
  GDPRRequestProcessingSchema,
  DataBreachDetectionSchema,
  AdminWarningSchema,
  AdminActionLogQuerySchema,
} from '@/schemas/adminSchema';
import {
  createMockReportReview,
  createMockUserSuspension,
  createMockSpaceModeration,
  createInvalidUuid,
  createInvalidDate,
  createTooLongString,
} from '../factories/mockData';

describe('Admin Schemas', () => {
  describe('ReportReviewSchema', () => {
    it('should validate all report statuses', () => {
      const statuses = ['open', 'under_review', 'resolved', 'dismissed'] as const;
      statuses.forEach(new_status => {
        const data = createMockReportReview({ new_status });
        const result = ReportReviewSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate without admin notes', () => {
      const data = createMockReportReview({ admin_notes: undefined });
      const result = ReportReviewSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject admin_notes exceeding 1000 characters', () => {
      const data = createMockReportReview({
        admin_notes: createTooLongString(1000),
      });
      const result = ReportReviewSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('UserSuspensionSchema', () => {
    it('should validate temporary suspension', () => {
      const validData = createMockUserSuspension();
      const result = UserSuspensionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate permanent suspension', () => {
      const data = createMockUserSuspension({
        permanent: true,
        duration_days: undefined,
      });
      const result = UserSuspensionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject suspension reason too short', () => {
      const data = createMockUserSuspension({
        suspension_reason: 'Breve',
      });
      const result = UserSuspensionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject suspension reason too long', () => {
      const data = createMockUserSuspension({
        suspension_reason: createTooLongString(500),
      });
      const result = UserSuspensionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject duration_days less than 1', () => {
      const data = createMockUserSuspension({ duration_days: 0 });
      const result = UserSuspensionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject duration_days greater than 365', () => {
      const data = createMockUserSuspension({ duration_days: 366 });
      const result = UserSuspensionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('UserReactivationSchema', () => {
    it('should validate user reactivation', () => {
      const data = {
        target_user_id: '123e4567-e89b-12d3-a456-426614174000',
        reactivation_notes: 'Utente riattivato dopo revisione',
      };
      const result = UserReactivationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate without notes', () => {
      const data = {
        target_user_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = UserReactivationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('SpaceSuspensionSchema', () => {
    it('should validate space suspension with all options', () => {
      const data = {
        space_id: '123e4567-e89b-12d3-a456-426614174000',
        suspension_reason: 'Contenuto inappropriato rilevato nello spazio',
        cancel_bookings: true,
        notify_host: true,
        notify_guests: true,
      };
      const result = SpaceSuspensionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const data = {
        space_id: '123e4567-e89b-12d3-a456-426614174000',
        suspension_reason: 'Motivo di sospensione valido con almeno 10 caratteri',
      };
      const result = SpaceSuspensionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cancel_bookings).toBe(true);
        expect(result.data.notify_host).toBe(true);
        expect(result.data.notify_guests).toBe(true);
      }
    });
  });

  describe('SpaceModerationSchema', () => {
    it('should validate space approval', () => {
      const validData = createMockSpaceModeration({ approve: true });
      const result = SpaceModerationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate space rejection with reason', () => {
      const data = createMockSpaceModeration({
        approve: false,
        rejection_reason: 'Lo spazio non rispetta i criteri minimi di qualità',
      });
      const result = SpaceModerationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject space rejection without reason', () => {
      const data = createMockSpaceModeration({
        approve: false,
        rejection_reason: undefined,
      });
      const result = SpaceModerationSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obbligatorio');
      }
    });
  });

  describe('SpaceRevisionReviewSchema', () => {
    it('should validate space revision approval', () => {
      const data = {
        space_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: true,
        admin_notes: 'Modifiche approvate',
      };
      const result = SpaceRevisionReviewSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate without admin notes', () => {
      const data = {
        space_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: false,
      };
      const result = SpaceRevisionReviewSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('TagApprovalSchema', () => {
    it('should validate tag approval', () => {
      const data = {
        tag_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: true,
      };
      const result = TagApprovalSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate tag rejection with reason', () => {
      const data = {
        tag_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: false,
        rejection_reason: 'Tag non conforme alle policy',
      };
      const result = TagApprovalSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('GDPRRequestProcessingSchema', () => {
    it('should validate GDPR request processing', () => {
      const data = {
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: true,
        admin_notes: 'Richiesta GDPR processata',
        corrections_applied: { email: 'new@example.com' },
      };
      const result = GDPRRequestProcessingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate without optional fields', () => {
      const data = {
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        approved: false,
      };
      const result = GDPRRequestProcessingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('DataBreachDetectionSchema', () => {
    it('should validate complete data breach detection', () => {
      const data = {
        breach_nature: 'Accesso non autorizzato ai dati utente rilevato nel sistema',
        affected_count: 150,
        affected_data_types: ['email', 'personal_info'],
        breach_severity: 'high' as const,
      };
      const result = DataBreachDetectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const data = {
        breach_nature: 'Descrizione della violazione dei dati con almeno 20 caratteri',
      };
      const result = DataBreachDetectionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.affected_count).toBe(0);
        expect(result.data.affected_data_types).toEqual([]);
        expect(result.data.breach_severity).toBe('medium');
      }
    });

    it('should validate all data types', () => {
      const types = [
        'email',
        'password',
        'personal_info',
        'payment_info',
        'location',
        'other',
      ];
      const data = {
        breach_nature: 'Violazione completa dei dati con tutti i tipi compromessi',
        affected_data_types: types,
      };
      const result = DataBreachDetectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject breach_nature too short', () => {
      const data = {
        breach_nature: 'Troppo breve',
      };
      const result = DataBreachDetectionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('AdminWarningSchema', () => {
    it('should validate all warning types', () => {
      const types = [
        'policy_violation',
        'spam',
        'inappropriate_content',
        'other',
      ] as const;
      types.forEach(warning_type => {
        const data = {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          warning_type,
          severity: 'medium' as const,
          title: 'Avviso',
          message: 'Messaggio di avviso',
        };
        const result = AdminWarningSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all severity levels', () => {
      const severities = ['low', 'medium', 'high'] as const;
      severities.forEach(severity => {
        const data = {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          warning_type: 'spam' as const,
          severity,
          title: 'Avviso',
          message: 'Messaggio di avviso',
        };
        const result = AdminWarningSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('AdminActionLogQuerySchema', () => {
    it('should validate complete query', () => {
      const data = {
        admin_id: '123e4567-e89b-12d3-a456-426614174000',
        action_type: 'suspend_user',
        target_type: 'user',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
        limit: 50,
      };
      const result = AdminActionLogQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use default limit', () => {
      const data = {};
      const result = AdminActionLogQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should reject invalid date format', () => {
      const data = {
        date_from: createInvalidDate(),
      };
      const result = AdminActionLogQuerySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
