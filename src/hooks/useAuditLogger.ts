import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  action_type: string;
  target_type: string;
  target_id: string;
  description: string;
  metadata?: Record<string, any>;
}

export const useAuditLogger = () => {
  const logAction = useCallback(async (entry: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('Cannot log action: no authenticated user');
        return;
      }

      // Get additional context
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');

      const userAgent = navigator.userAgent;
      const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
      sessionStorage.setItem('session_id', sessionId);

      const { error } = await supabase
        .from('admin_actions_log')
        .insert({
          admin_id: user.id,
          action_type: entry.action_type,
          target_type: entry.target_type,
          target_id: entry.target_id,
          description: entry.description,
          metadata: entry.metadata || {},
          ip_address: ipAddress,
          user_agent: userAgent,
          session_id: sessionId
        });

      if (error) {
        console.error('Failed to log audit entry:', error);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }, []);

  const logFailedLogin = useCallback(async (email: string, reason: string) => {
    try {
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');

      const userAgent = navigator.userAgent;
      const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();

      const { error } = await supabase
        .from('failed_login_attempts')
        .insert({
          email,
          reason,
          ip_address: ipAddress,
          user_agent: userAgent,
          session_id: sessionId
        });

      if (error) {
        console.error('Failed to log failed login:', error);
      }
    } catch (error) {
      console.error('Failed login logging error:', error);
    }
  }, []);

  return {
    logAction,
    logFailedLogin
  };
};
