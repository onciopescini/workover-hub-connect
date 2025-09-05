import { useState, useCallback } from 'react';
import { useSecurity } from './useSecurity';
import { ClientRateLimit } from '@/utils/security';

interface UseSecureFormOptions {
  formId: string;
  maxAttempts?: number;
  windowMs?: number;
}

export const useSecureForm = ({ formId, maxAttempts = 5, windowMs = 60000 }: UseSecureFormOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { validateInput, checkRateLimit } = useSecurity();

  const validateField = useCallback((name: string, value: string, type?: 'html' | 'url' | 'general') => {
    const result = validateInput(value, type);
    
    if (!result.valid) {
      setErrors(prev => ({ ...prev, [name]: result.message || 'Invalid input' }));
      return false;
    }
    
    // Clear error if validation passes
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    
    return true;
  }, [validateInput]);

  const secureSubmit = useCallback(async (
    submitFn: () => Promise<void>,
    identifier?: string
  ) => {
    if (isSubmitting) return false;

    // Client-side rate limiting
    if (!ClientRateLimit.check(formId, maxAttempts, windowMs)) {
      setErrors({ form: 'Too many attempts. Please try again later.' });
      return false;
    }

    // Server-side rate limiting if identifier provided
    if (identifier) {
      const rateLimitResult = await checkRateLimit(identifier, formId);
      if (rateLimitResult && typeof rateLimitResult === 'object' && 'allowed' in rateLimitResult) {
        if (!rateLimitResult['allowed']) {
          const message = 'message' in rateLimitResult ? String(rateLimitResult['message']) : 'Rate limit exceeded';
          setErrors({ form: message });
          return false;
        }
      }
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await submitFn();
      ClientRateLimit.reset(formId); // Reset on success
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed';
      setErrors({ form: errorMessage });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formId, maxAttempts, windowMs, isSubmitting, checkRateLimit]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    isSubmitting,
    errors,
    validateField,
    secureSubmit,
    clearErrors
  };
};