import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { findOrCreatePrivateChat } from "@/lib/private-messaging-utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

interface StartChatButtonProps {
  targetUserId: string;
  onChatStarted?: (chatId: string) => void;
}

export const StartChatButton = ({ targetUserId, onChatStarted }: StartChatButtonProps) => {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [canStartChat, setCanStartChat] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Check if user can start chat (not blocked, has connection, etc.)
  useEffect(() => {
    const checkChatAccess = async () => {
      if (!authState.user?.id || authState.user.id === targetUserId) {
        setCanStartChat(false);
        setIsCheckingAccess(false);
        return;
      }

      try {
        // Check if target user is suspended or if current user is blocked
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('is_suspended, networking_enabled')
          .eq('id', targetUserId)
          .single();

        if (!targetProfile || targetProfile.is_suspended || !targetProfile.networking_enabled) {
          setCanStartChat(false);
          setIsCheckingAccess(false);
          return;
        }

        // Check if there's an accepted connection between users
        const { data: connection } = await supabase
          .from('connections')
          .select('status')
          .or(`sender_id.eq.${authState.user.id},receiver_id.eq.${authState.user.id}`)
          .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
          .eq('status', 'accepted')
          .single();

        setCanStartChat(!!connection);
      } catch (error) {
        sreLogger.error('Error checking chat access', { userId: authState.user?.id, targetUserId }, error as Error);
        setCanStartChat(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkChatAccess();
  }, [authState.user?.id, targetUserId]);

  const handleStartChat = async () => {
    if (!authState.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per inviare messaggi",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const chat = await findOrCreatePrivateChat(targetUserId);
      if (chat) {
        onChatStarted?.(chat.id);
        toast({
          title: "Chat avviata",
          description: "Ora puoi iniziare a messaggiare",
        });
      }
    } catch (error) {
      sreLogger.error('Error starting chat', { userId: authState.user?.id, targetUserId }, error as Error);
      toast({
        title: "Errore",
        description: "Impossibile avviare la chat. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!authState.user || isCheckingAccess) {
    return null;
  }

  if (!canStartChat) {
    return null; // Hide button if user can't start chat
  }

  return (
    <Button 
      onClick={handleStartChat}
      disabled={isLoading}
      size="sm"
      className="flex items-center gap-2"
    >
      <MessageCircle className="h-4 w-4" />
      {isLoading ? "Avvio chat..." : "Messaggio"}
    </Button>
  );
};