/**
 * Type guards per TypeScript strict mode
 */

// Error handling type guards
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
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
    typeof (data as Record<string, unknown>).id === 'string' &&
    typeof (data as Record<string, unknown>).first_name === 'string'
  );
}

// Array type guards
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number');
}