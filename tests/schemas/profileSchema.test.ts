import {
  ProfileEditFormSchema,
  OnboardingStepSchema,
  OnboardingRoleSchema,
  OnboardingProfileSchema,
  OnboardingPreferencesSchema,
  TaxInfoSchema,
  StripeOnboardingSchema,
  AgeConfirmationSchema,
} from '@/schemas/profileSchema';
import {
  createMockProfileEdit,
  createMockOnboardingProfile,
  createMockTaxInfo,
  createInvalidUrl,
  createTooLongString,
  createEmptyString,
} from '../factories/mockData';

describe('Profile Schemas', () => {
  describe('ProfileEditFormSchema', () => {
    it('should validate complete profile', () => {
      const validData = createMockProfileEdit();
      const result = ProfileEditFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate minimal profile', () => {
      const data = {
        full_name: 'Mario Rossi',
        networking_enabled: false,
      };
      const result = ProfileEditFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty full_name', () => {
      const data = createMockProfileEdit({ full_name: createEmptyString() });
      const result = ProfileEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject full_name exceeding 100 characters', () => {
      const data = createMockProfileEdit({
        full_name: createTooLongString(100),
      });
      const result = ProfileEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject bio exceeding 500 characters', () => {
      const data = createMockProfileEdit({ bio: createTooLongString(500) });
      const result = ProfileEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid LinkedIn URL', () => {
      const data = createMockProfileEdit({
        linkedin_url: createInvalidUrl(),
      });
      const result = ProfileEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid website URL', () => {
      const data = createMockProfileEdit({
        website_url: createInvalidUrl(),
      });
      const result = ProfileEditFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingStepSchema', () => {
    it('should validate step within range', () => {
      for (let step = 0; step <= 10; step++) {
        const result = OnboardingStepSchema.safeParse({ step });
        expect(result.success).toBe(true);
      }
    });

    it('should reject negative step', () => {
      const result = OnboardingStepSchema.safeParse({ step: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject step greater than 10', () => {
      const result = OnboardingStepSchema.safeParse({ step: 11 });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingRoleSchema', () => {
    it('should validate coworker role', () => {
      const result = OnboardingRoleSchema.safeParse({ role: 'coworker' });
      expect(result.success).toBe(true);
    });

    it('should validate host role', () => {
      const result = OnboardingRoleSchema.safeParse({ role: 'host' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const result = OnboardingRoleSchema.safeParse({ role: 'admin' });
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingProfileSchema', () => {
    it('should validate complete onboarding profile', () => {
      const validData = createMockOnboardingProfile();
      const result = OnboardingProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate minimal onboarding profile', () => {
      const data = {
        full_name: 'Mario Rossi',
      };
      const result = OnboardingProfileSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty full_name', () => {
      const data = createMockOnboardingProfile({
        full_name: createEmptyString(),
      });
      const result = OnboardingProfileSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('OnboardingPreferencesSchema', () => {
    it('should validate all work styles', () => {
      const styles = ['remoto', 'ibrido', 'ufficio', 'flessibile'] as const;
      styles.forEach(work_style => {
        const result = OnboardingPreferencesSchema.safeParse({ work_style });
        expect(result.success).toBe(true);
      });
    });

    it('should validate with interests', () => {
      const data = {
        work_style: 'remoto' as const,
        interests: ['sviluppo', 'design', 'marketing'],
      };
      const result = OnboardingPreferencesSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate without interests', () => {
      const data = {
        work_style: 'remoto' as const,
      };
      const result = OnboardingPreferencesSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('TaxInfoSchema', () => {
    it('should validate tax info with tax_id only', () => {
      const validData = createMockTaxInfo();
      const result = TaxInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate tax info with VAT and country', () => {
      const data = {
        country_code: 'IT',
        vat_number: 'IT12345678901',
        tax_id: 'RSSMRA80A01F205X',
      };
      const result = TaxInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject VAT number without country', () => {
      const data = {
        vat_number: 'IT12345678901',
      };
      const result = TaxInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('paese');
      }
    });

    it('should reject invalid country code', () => {
      const data = {
        country_code: 'INVALID',
        vat_number: 'IT12345678901',
      };
      const result = TaxInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject VAT number exceeding 20 characters', () => {
      const data = {
        country_code: 'IT',
        vat_number: createTooLongString(20),
      };
      const result = TaxInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('StripeOnboardingSchema', () => {
    it('should validate valid Stripe onboarding URLs', () => {
      const validData = {
        return_url: 'https://example.com/return',
        refresh_url: 'https://example.com/refresh',
      };
      const result = StripeOnboardingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid return_url', () => {
      const data = {
        return_url: createInvalidUrl(),
        refresh_url: 'https://example.com/refresh',
      };
      const result = StripeOnboardingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid refresh_url', () => {
      const data = {
        return_url: 'https://example.com/return',
        refresh_url: createInvalidUrl(),
      };
      const result = StripeOnboardingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('AgeConfirmationSchema', () => {
    it('should validate when user confirms 18+', () => {
      const result = AgeConfirmationSchema.safeParse({ is_18_or_older: true });
      expect(result.success).toBe(true);
    });

    it('should reject when user does not confirm 18+', () => {
      const result = AgeConfirmationSchema.safeParse({
        is_18_or_older: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('18 anni');
      }
    });
  });
});
