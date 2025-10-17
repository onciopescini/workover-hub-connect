
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { toast } from 'sonner';

interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export const useConnectionRequests = (userId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    fetchPendingRequests();

    // Real-time subscription for new connection requests
    const channel = supabase
      .channel(`connection-requests-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          sreLogger.debug('New connection request received', { payload });
          
          // Fetch sender details and add to pending requests
          const newId = (payload.new as any)['id'];
          fetchSenderDetails(newId).then(request => {
            if (request) {
              setPendingRequests(prev => [request, ...prev]);
              toast.info(`New connection request from ${request.sender?.first_name}`);
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connections',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          sreLogger.debug('Connection request updated', { payload });
          
          // Remove from pending if accepted/rejected
          const newStatus = (payload.new as any)['status'];
          const newId = (payload.new as any)['id'];
          if (newStatus !== 'pending') {
            setPendingRequests(prev => prev.filter(r => r.id !== newId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchPendingRequests = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!connections_sender_id_fkey(first_name, last_name, profile_photo_url)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingRequests((data || []) as ConnectionRequest[]);
    } catch (error) {
      sreLogger.error('Failed to fetch pending connection requests', { userId }, error as Error);
      toast.error('Failed to load connection requests');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSenderDetails = async (requestId: string): Promise<ConnectionRequest | null> => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          id,
          sender_id,
          receiver_id,
          status,
          created_at,
          sender:profiles!connections_sender_id_fkey(first_name, last_name, profile_photo_url)
        `)
        .eq('id', requestId)
        .single();

      if (error) throw error;

      return data as ConnectionRequest;
    } catch (error) {
      sreLogger.error('Failed to fetch sender details', { requestId }, error as Error);
      return null;
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Connection request accepted');
    } catch (error) {
      sreLogger.error('Failed to accept connection request', { requestId }, error as Error);
      toast.error('Failed to accept request');
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Connection request rejected');
    } catch (error) {
      sreLogger.error('Failed to reject connection request', { requestId }, error as Error);
      toast.error('Failed to reject request');
    }
  };

  return {
    pendingRequests,
    isLoading,
    acceptRequest,
    rejectRequest,
    refetch: fetchPendingRequests
  };
};
