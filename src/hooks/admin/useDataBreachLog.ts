import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLogger } from '@/hooks/useLogger';

export interface DataBreach {
  id: string;
  breach_date: string;
  detected_at: string;
  nature_of_breach: string;
  affected_data_types: string[];
  affected_users_count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  authority_notification_required: boolean;
  authority_notified_at?: string;
  containment_measures?: string;
  impact_assessment?: string;
  reported_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export const useDataBreachLog = () => {
  const { error: logError } = useLogger({ context: 'useDataBreachLog' });
  const [breaches, setBreaches] = useState<DataBreach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchBreaches = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('data_breach_log')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setBreaches((data || []) as DataBreach[]);
    } catch (err) {
      logError('Failed to fetch data breaches', err as Error);
      toast.error('Errore nel caricamento dei data breach');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBreachStatus = async (
    breachId: string,
    status: DataBreach['status'],
    updates?: Partial<DataBreach>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload: any = {
        status,
        updated_at: new Date().toISOString(),
        ...updates
      };

      if (status === 'resolved' && user) {
        payload.resolved_by = user.id;
        payload.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('data_breach_log')
        .update(payload)
        .eq('id', breachId);

      if (error) throw error;

      await fetchBreaches();
      toast.success('Stato data breach aggiornato');
    } catch (err) {
      logError('Failed to update breach status', err as Error);
      toast.error('Errore nell\'aggiornamento del data breach');
    }
  };

  const notifyAuthorities = async (breachId: string) => {
    try {
      // Call edge function to send notification
      const { error: functionError } = await supabase.functions.invoke('notify-data-breach-authorities', {
        body: { breachId }
      });

      if (functionError) throw functionError;

      // Update record
      const { error: updateError } = await supabase
        .from('data_breach_log')
        .update({ 
          authority_notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', breachId);

      if (updateError) throw updateError;

      await fetchBreaches();
      toast.success('Autorità notificate con successo');
    } catch (err) {
      logError('Failed to notify authorities', err as Error);
      toast.error('Errore nella notifica alle autorità');
    }
  };

  useEffect(() => {
    fetchBreaches();
  }, []);

  const filteredBreaches = breaches.filter(breach => {
    const matchesSeverity = filterSeverity === 'all' || breach.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || breach.status === filterStatus;
    return matchesSeverity && matchesStatus;
  });

  return {
    breaches: filteredBreaches,
    allBreaches: breaches,
    isLoading,
    filterSeverity,
    filterStatus,
    setFilterSeverity,
    setFilterStatus,
    fetchBreaches,
    updateBreachStatus,
    notifyAuthorities
  };
};
