import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { getOrCreateConversation } from '@/lib/chat';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { logInfo, logError } from '@/lib/sre-logger';

interface ContactHostButtonProps {
  hostId: string;
  spaceId: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ContactHostButton({
  hostId,
  spaceId,
  variant = "outline",
  size = "sm",
  className
}: ContactHostButtonProps) {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleContact = async () => {
    if (!authState.isAuthenticated) {
      toast.info('Effettua il login per contattare l\'host');
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (!authState.user?.id || isLoading) return;

    // Prevent contacting yourself
    if (authState.user.id === hostId) {
      toast.info('Non puoi inviare messaggi a te stesso');
      return;
    }

    setIsLoading(true);
    try {
      const coworkerId = authState.user.id;

      logInfo('Creating conversation with host', {
        component: 'ContactHostButton',
        hostId,
        coworkerId,
        spaceId
      });

      // We don't have a booking ID here, so we rely on getOrCreateConversation's fallback logic
      const conversationId = await getOrCreateConversation({
        hostId,
        coworkerId,
        spaceId,
      });

      logInfo('Navigating to conversation', {
        component: 'ContactHostButton',
        conversationId
      });
      navigate(`/messages/${conversationId}`);
    } catch (e: any) {
      logError('Error contacting host', {
        component: 'ContactHostButton',
        hostId,
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
      onClick={handleContact}
      disabled={isLoading}
      className={className}
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      {isLoading ? 'Attendi...' : 'Contatta Host'}
    </Button>
  );
}
