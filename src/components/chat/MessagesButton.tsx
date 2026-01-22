import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { getOrCreateConversation } from '@/lib/chat';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { logInfo, logError } from '@/lib/sre-logger';
import { BookingWithDetails } from '@/types/booking';

interface MessagesButtonProps {
  booking: BookingWithDetails;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  className?: string;
}

export function MessagesButton({ 
  booking, 
  variant = "outline", 
  size = "sm",
  disabled = false,
  className 
}: MessagesButtonProps) {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const openMessages = async () => {
    if (!authState.user?.id || isLoading) return;
    
    setIsLoading(true);
    try {
      // Determine host and coworker IDs
      const hostId = booking.space?.host_id;
      const coworkerId = booking.user_id;
      
      if (!hostId || !coworkerId) {
        toast.error('Impossibile aprire la chat');
        return;
      }

      logInfo('Creating conversation for booking', {
        component: 'MessagesButton',
        bookingId: booking.id,
        hostId,
        coworkerId,
        spaceId: booking.space_id
      });

      const conversationId = await getOrCreateConversation({
        hostId,
        coworkerId,
        spaceId: booking.space_id,
        bookingId: booking.id,
      });

      logInfo('Navigating to conversation', {
        component: 'MessagesButton',
        conversationId,
        bookingId: booking.id
      });
      navigate(`/messages/${conversationId}`);
    } catch (e: any) {
      logError('Error opening messages', {
        component: 'MessagesButton',
        bookingId: booking.id,
        error: e.message
      }, e);
      toast.error('Errore durante l\'apertura della chat');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={openMessages}
      disabled={disabled || isLoading}
      className={className}
    >
      <MessageSquare className="w-4 h-4 mr-1" />
      {isLoading ? 'Caricamento...' : 'Messaggi'}
    </Button>
  );
}
