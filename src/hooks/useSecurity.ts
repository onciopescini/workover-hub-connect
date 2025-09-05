import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHtml, sanitizeUrl, containsSuspiciousContent } from '@/utils/security';

export const useSecurity = () => {
  
  const checkRateLimit = useCallback(async (identifier: string, action: string) => {
    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_action: action
      });
      
      if (error) {
        console.error('Rate limit check failed:', error);
        return { allowed: false, message: 'Security check failed' };
      }
      
      return data;
    } catch (error) {
      console.error('Rate limit error:', error);
      return { allowed: false, message: 'Security check failed' };
    }
  }, []);

  const logSensitiveDataAccess = useCallback(async (
    accessedUserId: string,
    tableName: string,
    columnNames: string[],
    accessType: 'read' | 'write' | 'delete'
  ) => {
    try {
      await supabase.rpc('log_sensitive_data_access', {
        p_accessed_user_id: accessedUserId,
        p_table_name: tableName,
        p_column_names: columnNames,
        p_access_type: accessType
      });
    } catch (error) {
      console.error('Failed to log data access:', error);
    }
  }, []);

  const validateInput = useCallback((input: string, type: 'html' | 'url' | 'general' = 'general') => {
    if (containsSuspiciousContent(input)) {
      return { valid: false, message: 'Input contains potentially dangerous content' };
    }

    switch (type) {
      case 'html':
        return { valid: true, sanitized: sanitizeHtml(input) };
      case 'url':
        const sanitizedUrl = sanitizeUrl(input);
        return { 
          valid: sanitizedUrl !== '', 
          sanitized: sanitizedUrl,
          message: sanitizedUrl === '' ? 'Invalid URL format' : undefined
        };
      default:
        return { valid: true, sanitized: input.trim() };
    }
  }, []);

  return {
    checkRateLimit,
    logSensitiveDataAccess,
    validateInput,
    sanitizeHtml,
    sanitizeUrl
  };
};