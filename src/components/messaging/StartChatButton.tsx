
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { findOrCreatePrivateChat } from "@/lib/private-messaging-utils";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface StartChatButtonProps {
  userId: string;
  userName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function StartChatButton({ 
  userId, 
  userName, 
  variant = "outline", 
  size = "sm",
  className 
}: StartChatButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartChat = async () => {
    setIsLoading(true);
    
    try {
      const chat = await findOrCreatePrivateChat(userId);
      
      if (chat) {
        navigate(`/private-chats/${chat.id}`);
        toast({
          title: "Chat aperta",
          description: `Ora puoi chattare con ${userName}`,
        });
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Errore",
        description: "Impossibile aprire la chat",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStartChat}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      {isLoading ? "Apertura..." : "Messaggio"}
    </Button>
  );
}

export default StartChatButton;
