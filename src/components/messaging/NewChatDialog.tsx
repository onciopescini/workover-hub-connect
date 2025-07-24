import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MessageCircle, Users } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConnectedUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  bio: string | null;
  profession: string | null;
}

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated?: (chatId: string) => void;
}

export const NewChatDialog = ({ open, onOpenChange, onChatCreated }: NewChatDialogProps) => {
  const { authState } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ConnectedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState<string | null>(null);

  useEffect(() => {
    if (open && authState.user?.id) {
      fetchConnectedUsers();
    }
  }, [open, authState.user?.id]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = connectedUsers.filter(user =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.profession?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(connectedUsers);
    }
  }, [searchQuery, connectedUsers]);

  const fetchConnectedUsers = async () => {
    if (!authState.user?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch users connected via networking
      const { data, error } = await supabase
        .from('connections')
        .select(`
          sender_id,
          receiver_id,
          sender:profiles!sender_id (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio,
            profession,
            networking_enabled
          ),
          receiver:profiles!receiver_id (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio,
            profession,
            networking_enabled
          )
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${authState.user.id},receiver_id.eq.${authState.user.id}`);

      if (error) throw error;

      const users: ConnectedUser[] = [];
      
      data?.forEach(connection => {
        const otherUser = connection.sender_id === authState.user?.id 
          ? connection.receiver 
          : connection.sender;
        
        if (otherUser?.networking_enabled && otherUser.id !== authState.user?.id) {
          users.push({
            id: otherUser.id,
            first_name: otherUser.first_name || '',
            last_name: otherUser.last_name || '',
            profile_photo_url: otherUser.profile_photo_url,
            bio: otherUser.bio,
            profession: otherUser.profession
          });
        }
      });

      // Remove duplicates
      const uniqueUsers = users.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );

      setConnectedUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching connected users:', error);
      toast.error('Errore nel caricamento degli utenti connessi');
    } finally {
      setIsLoading(false);
    }
  };

  const findOrCreatePrivateChat = async (otherUserId: string): Promise<string | null> => {
    if (!authState.user?.id) return null;

    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('private_chats')
        .select('id')
        .or(`
          and(participant_1_id.eq.${authState.user.id},participant_2_id.eq.${otherUserId}),
          and(participant_1_id.eq.${otherUserId},participant_2_id.eq.${authState.user.id})
        `)
        .single();

      if (existingChat) {
        return existingChat.id;
      }

      // Create new chat
      const { data: newChat, error } = await supabase
        .from('private_chats')
        .insert({
          participant_1_id: authState.user.id,
          participant_2_id: otherUserId
        })
        .select('id')
        .single();

      if (error) throw error;
      
      return newChat.id;
    } catch (error) {
      console.error('Error creating private chat:', error);
      return null;
    }
  };

  const handleStartChat = async (user: ConnectedUser) => {
    setIsStartingChat(user.id);
    try {
      const chatId = await findOrCreatePrivateChat(user.id);
      
      if (chatId) {
        toast.success(`Chat avviata con ${user.first_name} ${user.last_name}`);
        onChatCreated?.(chatId);
        onOpenChange(false);
        setSearchQuery('');
      } else {
        toast.error('Errore nel creare la chat');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Errore nell\'avviare la chat');
    } finally {
      setIsStartingChat(null);
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Nuova Chat
          </DialogTitle>
          <DialogDescription>
            Avvia una conversazione con i tuoi contatti networking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o professione..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Connected Users List */}
          <div className="max-h-[350px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Caricamento contatti...
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Card key={user.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.profile_photo_url || undefined} />
                          <AvatarFallback>
                            {getUserInitials(user.first_name, user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </p>
                          {user.profession && (
                            <p className="text-xs text-muted-foreground">
                              {user.profession}
                            </p>
                          )}
                          {user.bio && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartChat(user)}
                        disabled={isStartingChat === user.id}
                      >
                        {isStartingChat === user.id ? 'Avvio...' : 'Chat'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 space-y-2">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'Nessun contatto trovato' : 'Nessun contatto networking disponibile'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Connettiti con altri coworker tramite la sezione Networking
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};