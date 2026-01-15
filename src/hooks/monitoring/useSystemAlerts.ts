/**
 * System Alerts Hook
 * 
 * Manages real-time system alerts for admins, including performance issues,
 * errors, and critical system events.
 */

import { toast } from "sonner";
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

export interface SystemAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  acknowledged?: boolean;
}

interface UseSystemAlertsOptions {
  enableToasts?: boolean;
  autoAcknowledge?: boolean;
  severityFilter?: SystemAlert['severity'][];
}

export const useSystemAlerts = (options: UseSystemAlertsOptions = {}) => {
  const { 
    enableToasts = true, 
    autoAcknowledge = false,
    severityFilter = ['warning', 'critical']
  } = options;
  
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Fetch existing alerts
  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch recent errors from logs
      const { data: errorLogs, error } = await supabase
        .from('admin_actions_log')
        .select('*')
        .in('action_type', ['system_error', 'security_alert', 'performance_alert'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform logs to alerts
      const systemAlerts: SystemAlert[] = (errorLogs || []).map(log => {
        const metadata = log.metadata as any;
        return {
          id: log.id,
          type: log.action_type.includes('security') ? 'security' : 
                log.action_type.includes('performance') ? 'performance' : 'error',
          severity: determineSeverity(metadata),
          title: log.description,
          message: metadata?.message || log.description,
          timestamp: new Date(log.created_at || Date.now()),
          metadata: metadata || undefined,
          acknowledged: metadata?.acknowledged || false,
        };
      });

      setAlerts(systemAlerts);
      
    } catch (error) {
      sreLogger.error('Failed to fetch system alerts', {}, error as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add new alert
  const addAlert = useCallback((alert: Omit<SystemAlert, 'id' | 'timestamp'>) => {
    const newAlert: SystemAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      acknowledged: false,
    };

    setAlerts(prev => [newAlert, ...prev].slice(0, 100)); // Keep last 100

    // Show toast for critical/warning alerts
    if (enableToasts && severityFilter.includes(newAlert.severity)) {
      toast.success(newAlert.title, { description: newAlert.message });
    }

    // Log to Supabase (using auth.uid() for admin_id)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      
      supabase
        .from('admin_actions_log')
        .insert({
          admin_id: user.id,
          action_type: `${alert.type}_alert`,
          target_type: 'system',
          target_id: crypto.randomUUID(),
          description: alert.title,
          metadata: {
            message: alert.message,
            severity: alert.severity,
            ...alert.metadata,
          },
        })
        .then(({ error }) => {
          if (error) sreLogger.error('Failed to log alert', {}, error);
        });
    });

    return newAlert.id;
  }, [enableToasts, severityFilter, toast]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );

    // Update in Supabase
    supabase
      .from('admin_actions_log')
      .update({ metadata: { acknowledged: true } })
      .eq('id', alertId)
      .then(({ error }) => {
        if (error) sreLogger.error('Failed to acknowledge alert', {}, error);
      });
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Auto-acknowledge if enabled
  useEffect(() => {
    if (autoAcknowledge) {
      const unacknowledged = alerts.filter(a => !a.acknowledged);
      unacknowledged.forEach(alert => {
        setTimeout(() => acknowledgeAlert(alert.id), 5000);
      });
    }
  }, [alerts, autoAcknowledge, acknowledgeAlert]);

  return {
    alerts,
    isLoading,
    addAlert,
    acknowledgeAlert,
    clearAlerts,
    refetch: fetchAlerts,
    unacknowledgedCount: alerts.filter(a => !a.acknowledged).length,
    criticalCount: alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
  };
};

// Helper to determine severity from metadata
function determineSeverity(metadata?: any): SystemAlert['severity'] {
  if (!metadata) return 'info';
  
  const severity = metadata.severity || metadata.level;
  if (severity === 'critical' || severity === 'error') return 'critical';
  if (severity === 'warning' || severity === 'warn') return 'warning';
  return 'info';
}
