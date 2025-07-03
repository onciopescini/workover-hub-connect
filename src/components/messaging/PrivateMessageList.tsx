import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PrivateMessage } from "@/types/networking";
import { fetchPrivateMessages, sendPrivateMessage, uploadPrivateMessageAttachment, markPrivateMessageAsRead } from "@/lib/private-messaging-utils";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Send, Download, FileIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface PrivateMessageListProps {
  chatId: string;
}

export function PrivateMessageList({ chatId }: PrivateMessageListProps) {
  const { authState } = useAuth();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      const data = await fetchPrivateMessages(chatId);
      setMessages(data);
      setIsLoading(false);
      
      // Marca i nuovi messaggi come letti
      data.forEach(msg => {
        if (!msg.is_read && msg.sender_id !== authState.user?.id) {
          markPrivateMessageAsRead(msg.id);
        }
      });
    };

    if (chatId) {
      loadMessages();
    }

    // Setup real-time listener per nuovi messaggi
    const channel = supabase
      .channel('private-messages-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const newMsg = payload.new as PrivateMessage;
        setMessages(prev => {
          const exists = prev.some(m => m.id === newMsg.id);
          if (!exists) {
            // Marca come letto se non è dal mittente corrente
            if (newMsg.sender_id !== authState.user?.id && !newMsg.is_read) {
              markPrivateMessageAsRead(newMsg.id);
            }
            return [...prev, newMsg];
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, authState.user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File troppo grande",
          description: "La dimensione massima del file è 5MB",
          variant: "destructive",
        });
        return;
      }
      setAttachment(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage || newMessage.trim() === '') && !attachment) return;
    
    try {
      setIsLoading(true);
      
      let attachments: string[] = [];
      
      if (attachment) {
        const uploadedUrl = await uploadPrivateMessageAttachment(attachment);
        if (uploadedUrl) {
          attachments = [uploadedUrl];
        }
      }
      
      await sendPrivateMessage(chatId, newMessage.trim(), attachments);
      
      setNewMessage("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error sending private message:", error);
      toast({
        title: "Errore nell'invio del messaggio",
        description: "Riprova più tardi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('it-IT', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const isCurrentUserMessage = (message: PrivateMessage) => {
    return message.sender_id === authState.user?.id;
  };

  const getAttachmentType = (url: string) => {
    if (!url) return null;
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    }
    return 'file';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Nessun messaggio ancora. Inizia la conversazione!
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = isCurrentUserMessage(message);
            const sender = message.sender;
            
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} max-w-[80%] gap-2`}>
                  {!isCurrentUser && (
                    <Avatar className="h-8 w-8 mt-1">
                      {sender?.profile_photo_url ? (
                        <AvatarImage src={sender.profile_photo_url} alt={`${sender.first_name} ${sender.last_name}`} />
                      ) : (
                        <AvatarFallback>{getInitials(sender?.first_name, sender?.last_name)}</AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  
                  <div className={`space-y-1 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <Card className={`${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-100'} rounded-lg shadow-sm`}>
                      <CardContent className="p-3">
                        {message.content && <p>{message.content}</p>}
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2">
                            {message.attachments.map((url, index) => (
                              getAttachmentType(url) === 'image' ? (
                                <a 
                                  key={index}
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img 
                                    src={url} 
                                    alt="Allegato" 
                                    className="max-w-full max-h-48 rounded-md" 
                                  />
                                </a>
                              ) : (
                                <a 
                                  key={index}
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 py-1 px-2 rounded-md ${isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                                >
                                  <FileIcon className="h-4 w-4" />
                                  <span className="text-sm truncate">Allegato</span>
                                  <Download className="h-4 w-4" />
                                </a>
                              )
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <div className={`text-xs text-gray-500 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                      {!isCurrentUser && (
                        <span>{sender?.first_name} • </span>
                      )}
                      <span>{formatMessageTime(message.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        {attachment && (
          <div className="flex items-center mb-2 p-2 bg-gray-100 rounded">
            <div className="flex-1 truncate">{attachment.name}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              &times;
            </Button>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleAttachment}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Scrivi un messaggio..."
            className="resize-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || ((!newMessage || newMessage.trim() === '') && !attachment)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
}

export default PrivateMessageList;
