
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Calendar, Clock } from "lucide-react";
import { ConversationItem } from "@/types/messaging";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: ConversationItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const ConversationSidebar = ({
  conversations,
  selectedId,
  onSelect
}: ConversationSidebarProps) => {
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('it-IT', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'private': return MessageSquare;
      default: return MessageSquare;
    }
  };

  if (conversations.length === 0) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="flex items-center justify-center h-full p-4">
          <div className="text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-sm">Nessuna conversazione</p>
            <p className="text-xs">Le tue chat appariranno qui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 h-full flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => {
              const Icon = getTypeIcon(conversation.type);
              const isSelected = conversation.id === selectedId;
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all duration-200",
                    "hover:bg-gray-50 hover:shadow-sm border-l-4",
                    isSelected 
                      ? "bg-blue-50 border-l-blue-500 shadow-sm" 
                      : "border-l-transparent hover:border-l-gray-200"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                      <AvatarImage src={conversation.avatar} />
                      <AvatarFallback>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 truncate text-sm">
                          {conversation.title}
                        </h4>
                        {conversation.lastMessageTime && (
                          <span className="text-xs text-gray-500 flex items-center flex-shrink-0 ml-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 truncate mb-2">
                        {conversation.subtitle}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {conversation.type}
                          </Badge>
                          {conversation.status && (
                            <Badge className={cn("text-xs", getStatusColor(conversation.status))}>
                              {conversation.status}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {conversation.unreadCount && conversation.unreadCount > 0 && (
                            <Badge className="bg-blue-500 text-white text-xs min-w-5 h-5 flex items-center justify-center">
                              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </Badge>
                          )}
                          {conversation.isOnline && (
                            <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
