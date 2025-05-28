
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { MessageList } from '@/components/messaging/MessageList';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Messages = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['user-bookings-with-messages', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          spaces (
            id,
            title,
            host_id
          )
        `)
        .or(`user_id.eq.${authState.user.id},spaces.host_id.eq.${authState.user.id}`);

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!authState.user?.id,
  });

  if (isLoading) {
    return (
      <AppLayout title="Messaggi" subtitle="I tuoi messaggi di prenotazione">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Messaggi" subtitle="I tuoi messaggi di prenotazione">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/private-chats')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Chat Private
            </Button>
          </div>
        </div>

        {!bookings || bookings.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessun messaggio
            </h3>
            <p className="text-gray-600">
              Non hai ancora messaggi relativi alle prenotazioni.
            </p>
          </div>
        ) : (
          <MessageList bookings={bookings} />
        )}
      </div>
    </AppLayout>
  );
};

export default Messages;
