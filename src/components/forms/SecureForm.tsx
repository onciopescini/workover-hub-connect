import React, { useState } from 'react';
import { useRateLimit } from '@/hooks/useRateLimit';
import { validateInput, sanitizeText, sanitizeHtml } from '@/lib/input-sanitization';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { sreLogger } from '@/lib/sre-logger';

interface SecureFormProps<T> {
  schema: z.ZodSchema<T>;
  endpoint: string;
  onSubmit: (data: T) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  children: React.ReactNode;
  className?: string;
  submitButtonText?: string;
  title?: string;
  description?: string;
  rateLimitBypass?: boolean;
}

interface FormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'password' | 'textarea' | 'url';
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
  sanitize?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  value,
  onChange,
  error,
  maxLength,
  sanitize = true
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    if (sanitize) {
      newValue = type === 'textarea' ? sanitizeHtml(newValue, []) : sanitizeText(newValue);
    }
    
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.substring(0, maxLength);
    }
    
    onChange(newValue);
  };

  const inputProps = {
    id: name,
    name,
    value,
    onChange: handleChange,
    placeholder,
    required,
    className: error ? 'border-destructive' : '',
    maxLength
  };

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <Textarea 
          {...inputProps}
          rows={4}
        />
      ) : (
        <Input 
          {...inputProps}
          type={type}
        />
      )}
      
      {maxLength && (
        <div className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </div>
      )}
      
      {error && (
        <div className="text-sm text-destructive flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
};

export function SecureForm<T>({
  schema,
  endpoint,
  onSubmit,
  onSuccess,
  onError,
  children,
  className = '',
  submitButtonText = 'Invia',
  title,
  description,
  rateLimitBypass = false
}: SecureFormProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const { checkRateLimit, isChecking } = useRateLimit();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);
    setSecurityWarnings([]);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Convert FormData to object
      const data: any = {};
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      // Validate input
      const validation = validateInput(schema, data);
      
      if (!validation.success) {
        setErrors(validation.errors);
        return;
      }

      // Security checks
      const warnings: string[] = [];
      const suspiciousPatterns = [
        { pattern: /<script/i, message: 'Rilevato possibile codice script' },
        { pattern: /javascript:/i, message: 'Rilevato URL JavaScript' },
        { pattern: /on\w+\s*=/i, message: 'Rilevati event handler HTML' },
        { pattern: /\.\.[\/\\]/g, message: 'Rilevato possibile path traversal' }
      ];

      Object.values(data).forEach((value: any) => {
        if (typeof value === 'string') {
          suspiciousPatterns.forEach(({ pattern, message }) => {
            if (pattern.test(value)) {
              warnings.push(message);
            }
          });
        }
      });

      if (warnings.length > 0) {
        setSecurityWarnings(warnings);
        sreLogger.warn('Security warnings detected in form submission', { 
          component: 'SecureForm',
          endpoint,
          warningCount: warnings.length 
        });
      }

      // Check rate limit if not bypassed
      if (!rateLimitBypass) {
        const rateLimitCheck = await checkRateLimit({ endpoint });
        
        if (!rateLimitCheck.allowed) {
          const retryAfter = rateLimitCheck.retryAfter || 60;
          throw new Error(`Troppi tentativi. Riprova tra ${retryAfter} secondi.`);
        }
      }

      await onSubmit(validation.data);
      onSuccess?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Si è verificato un errore';
      setErrors([errorMessage]);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {title && (
        <div className="space-y-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Security Warnings */}
      {securityWarnings.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="font-medium mb-1">Avvisi di sicurezza rilevati:</div>
            <ul className="list-disc list-inside space-y-1">
              {securityWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <div className="font-medium mb-1">Si sono verificati i seguenti errori:</div>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form 
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {children}
        
        <Button 
          type="submit" 
          disabled={isSubmitting || isChecking}
          className="w-full"
        >
          {isSubmitting || isChecking ? 'Invio in corso...' : submitButtonText}
        </Button>
      </form>
    </div>
  );
}

// Hook for form state management with security
export const useSecureForm = <T,>(initialData: T) => {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const setFieldError = (field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }));
  };

  const clearErrors = () => {
    setErrors({});
  };

  const resetForm = () => {
    setData(initialData);
    setErrors({});
  };

  return {
    data,
    errors,
    updateField,
    setFieldError,
    clearErrors,
    resetForm,
    hasErrors: Object.keys(errors).length > 0
  };
};

export default SecureForm;