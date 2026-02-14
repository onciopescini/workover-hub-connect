import {
  CLIENT_WRITABLE_PROFILE_FIELDS,
  NON_WRITABLE_PROFILE_FIELDS,
  NULLABLE_STRING_PROFILE_FIELDS,
  type ProfileField,
} from '@/constants/profile';
import type { Profile } from '@/types/auth';

const WRITABLE_PROFILE_FIELD_SET = new Set<ProfileField>(CLIENT_WRITABLE_PROFILE_FIELDS);

export const sanitizeProfileUpdate = (rawUpdates: Partial<Profile>): Partial<Profile> => {
  const sanitized: Partial<Profile> = {};

  for (const [key, value] of Object.entries(rawUpdates)) {
    if (value === undefined) {
      continue;
    }

    if (NON_WRITABLE_PROFILE_FIELDS.has(key) || !WRITABLE_PROFILE_FIELD_SET.has(key as ProfileField)) {
      continue;
    }

    const field = key as ProfileField;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      sanitized[field] = NULLABLE_STRING_PROFILE_FIELDS.has(field) && trimmed.length === 0 ? null : trimmed;
      continue;
    }

    sanitized[field] = value;
  }

  return sanitized;
};

export const sanitizeOnboardingProfileUpdate = (rawUpdates: Partial<Profile>): Partial<Profile> => ({
  ...sanitizeProfileUpdate(rawUpdates),
  onboarding_completed: true,
});

