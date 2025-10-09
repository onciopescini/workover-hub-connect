import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminActionLog } from '@/types/admin';
import { useLogger } from '@/hooks/useLogger';

export const useAdminActivityLog = (limit: number = 50) => {
  const { error: logError } = useLogger({ context: 'useAdminActivityLog' });
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('admin_actions_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        logError('Error fetching admin activity log', err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();

    // Real-time subscription
    const channel = supabase
      .channel('admin-activity-log')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_actions_log'
        },
        (payload) => {
          setLogs(prev => [payload.new as AdminActionLog, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, logError]);

  return { logs, isLoading };
};
