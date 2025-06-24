import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle, Calendar, Users, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { ConversationItem } from "@/types/messaging";

interface ConversationSidebarProps {
  conversations: ConversationItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
}

export const ConversationSidebar = ({
  conversations,
  selectedId,
  onSelect,
  onNewChat
}: ConversationSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getConversationIcon = (type: string) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'private': return MessageCircle;
      case 'group': return Users;
      default: return MessageCircle;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Messaggi</h2>
          <Badge variant="secondary" className="text-xs">
            {filteredConversations.length}
          </Badge>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca conversazioni..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Nessuna conversazione trovata</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => {
                const Icon = getConversationIcon(conversation.type);
                const isSelected = selectedId === conversation.id;
                
                return (
                  <div
                    key={conversation.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => onSelect(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.avatar} />
                          <AvatarFallback>
                            <Icon className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        
                        {conversation.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {conversation.title}
                          </h3>
                          <div className="flex items-center gap-1">
                            {conversation.priority && conversation.priority !== 'normal' && (
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(conversation.priority)}`}></div>
                            )}
                            {conversation.lastMessageTime && (
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(conversation.lastMessageTime), {
                                  addSuffix: true,
                                  locale: it
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-1 truncate">
                          {conversation.subtitle}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          {conversation.lastMessage && (
                            <p className="text-xs text-gray-500 truncate flex-1">
                              {conversation.lastMessage}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2">
                            {conversation.status && (
                              <Badge 
                                variant={conversation.status === 'confirmed' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {conversation.status}
                              </Badge>
                            )}
                            
                            {conversation.unreadCount && conversation.unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white text-xs min-w-5 h-5 flex items-center justify-center rounded-full">
                                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
