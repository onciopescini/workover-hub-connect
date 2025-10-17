import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  enabled: boolean;
  channel: 'in_app' | 'email' | 'both';
  created_at: string;
  updated_at: string;
}

const DEFAULT_NOTIFICATION_TYPES = [
  { type: 'booking', label: 'Prenotazioni', description: 'Nuove prenotazioni e aggiornamenti' },
  { type: 'message', label: 'Messaggi', description: 'Nuovi messaggi nelle conversazioni' },
  { type: 'event', label: 'Eventi', description: 'Notifiche sugli eventi' },
  { type: 'review', label: 'Recensioni', description: 'Nuove recensioni ricevute' },
  { type: 'system', label: 'Sistema', description: 'Aggiornamenti di sistema importanti' },
  { type: 'ticket', label: 'Supporto', description: 'Risposte ai ticket di supporto' },
  { type: 'connection', label: 'Network', description: 'Richieste di connessione e aggiornamenti' },
];

export const useNotificationPreferences = () => {
  const { authState } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!authState.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', authState.user.id);

      if (error) throw error;

      // Create default preferences for missing types
      const existingTypes = new Set(data?.map(p => p.notification_type) || []);
      const missingTypes = DEFAULT_NOTIFICATION_TYPES.filter(
        t => !existingTypes.has(t.type)
      );

      if (missingTypes.length > 0) {
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert(
            missingTypes.map(t => ({
              user_id: authState.user!.id,
              notification_type: t.type,
              enabled: true,
              channel: 'in_app' as const
            }))
          );

        if (insertError) throw insertError;

        // Refetch after creating defaults
        const { data: updatedData, error: refetchError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', authState.user.id);

        if (refetchError) throw refetchError;
        setPreferences((updatedData as NotificationPreference[]) || []);
      } else {
        setPreferences((data as NotificationPreference[]) || []);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Errore nel caricamento delle preferenze');
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = useCallback(async (
    notificationType: string,
    updates: { enabled?: boolean; channel?: 'in_app' | 'email' | 'both' }
  ) => {
    if (!authState.user?.id) return;

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: authState.user.id,
          notification_type: notificationType,
          ...updates,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Preferenze aggiornate');
      await fetchPreferences();
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Errore nell\'aggiornamento');
    }
  }, [authState.user?.id, fetchPreferences]);

  return {
    preferences,
    isLoading,
    updatePreference,
    notificationTypes: DEFAULT_NOTIFICATION_TYPES
  };
};
