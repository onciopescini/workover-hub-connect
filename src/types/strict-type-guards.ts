/**
 * Type guards per TypeScript strict mode
 */

// Error handling type guards
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>)['message'] === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): { message: string } {
  if (isErrorWithMessage(maybeError)) return maybeError;
  
  try {
    return { message: JSON.stringify(maybeError) };
  } catch {
    return { message: String(maybeError) };
  }
}

// Metadata type guards  
export type SafeMetadata = Record<string, string | number | boolean | null>;

export function isSafeMetadata(value: unknown): value is SafeMetadata {
  if (typeof value !== 'object' || value === null) return false;
  
  return Object.values(value).every(v => 
    typeof v === 'string' || 
    typeof v === 'number' || 
    typeof v === 'boolean' || 
    v === null
  );
}

// Supabase response guards
export function isValidProfile(data: unknown): data is { id: string; first_name: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'first_name' in data &&
    typeof (data as Record<string, unknown>)['id'] === 'string' &&
    typeof (data as Record<string, unknown>)['first_name'] === 'string'
  );
}

// Array type guards
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number');
}

// Enhanced type guards for strict mode compatibility
export function hasProperty<T extends string>(
  obj: unknown,
  property: T
): obj is Record<T, unknown> {
  return typeof obj === 'object' && obj !== null && property in obj;
}

export function isValidBookingData(value: unknown): value is {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'space_id') &&
    hasProperty(value, 'user_id') &&
    hasProperty(value, 'booking_date') &&
    hasProperty(value, 'start_time') &&
    hasProperty(value, 'end_time') &&
    hasProperty(value, 'status') &&
    hasProperty(value, 'created_at') &&
    hasProperty(value, 'updated_at') &&
    typeof (value as Record<string, unknown>)['id'] === 'string' &&
    typeof (value as Record<string, unknown>)['space_id'] === 'string' &&
    typeof (value as Record<string, unknown>)['user_id'] === 'string'
  );
}

export function isValidSpaceData(value: unknown): value is {
  id: string;
  title: string;
  address: string;
  photos: unknown;
  host_id: string;
  price_per_day: number;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'title') &&
    hasProperty(value, 'address') &&
    hasProperty(value, 'host_id') &&
    typeof (value as Record<string, unknown>)['id'] === 'string' &&
    typeof (value as Record<string, unknown>)['title'] === 'string' &&
    typeof (value as Record<string, unknown>)['address'] === 'string' &&
    typeof (value as Record<string, unknown>)['host_id'] === 'string'
  );
}

export function isValidProfileData(value: unknown): value is {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'first_name') &&
    hasProperty(value, 'last_name') &&
    typeof (value as Record<string, unknown>)['id'] === 'string' &&
    typeof (value as Record<string, unknown>)['first_name'] === 'string' &&
    typeof (value as Record<string, unknown>)['last_name'] === 'string'
  );
}

// Enhanced booking data validation
export function isValidBookingWithSpace(value: unknown): value is {
  id: string;
  spaces: { id: string; title: string; address: string; photos: string[]; host_id: string; price_per_day: number };
  profiles?: { id: string; first_name: string; last_name: string; profile_photo_url?: string };
  [key: string]: unknown;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'spaces') &&
    typeof (value as Record<string, unknown>)['id'] === 'string' &&
    isValidSpaceData((value as Record<string, unknown>)['spaces'])
  );
}

// Message with sender validation
export function isValidMessageWithSender(value: unknown): value is {
  sender?: { first_name: string; last_name: string; profile_photo_url?: string };
  sender_id: string;
  [key: string]: unknown;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasProperty(value, 'sender_id') &&
    typeof (value as Record<string, unknown>)['sender_id'] === 'string'
  );
}

// Complete profile validation
export function isCompleteProfile(value: unknown): value is Record<string, unknown> & {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  bio?: string;
  location?: string;
  competencies?: string[];
  industries?: string[];
  created_at: string;
  [key: string]: unknown;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'first_name') &&
    hasProperty(value, 'last_name') &&
    hasProperty(value, 'created_at') &&
    typeof (value as Record<string, unknown>)['id'] === 'string' &&
    typeof (value as Record<string, unknown>)['first_name'] === 'string' &&
    typeof (value as Record<string, unknown>)['last_name'] === 'string' &&
    typeof (value as Record<string, unknown>)['created_at'] === 'string'
  );
}