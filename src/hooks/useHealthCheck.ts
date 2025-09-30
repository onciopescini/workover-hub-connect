import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  services: {
    database: string;
    auth: string;
    storage: string;
  };
  lastCheck: Date;
  responseTime?: number;
}

export const useHealthCheck = (intervalMs = 60000) => {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'unknown',
    services: { database: 'unknown', auth: 'unknown', storage: 'unknown' },
    lastCheck: new Date()
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('health-check');
        
        if (error) throw error;
        
        setHealth({
          status: data.status,
          services: data.services,
          lastCheck: new Date(),
          responseTime: data.metrics?.responseTime
        });
      } catch (error) {
        console.error('[HealthCheck] Failed:', error);
        setHealth(prev => ({
          ...prev,
          status: 'unhealthy',
          lastCheck: new Date()
        }));
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, intervalMs);
    
    return () => clearInterval(interval);
  }, [intervalMs]);

  return health;
};
