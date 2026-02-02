// Types for validation suite - extracted to break circular dependency

export interface ValidationResult {
  category: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
  error?: unknown;
}

export interface PaymentValidationResult {
  passed: boolean;
  results: Array<{ passed: boolean; name?: string; message?: string }>;
  passedCount: number;
  totalCount: number;
}
