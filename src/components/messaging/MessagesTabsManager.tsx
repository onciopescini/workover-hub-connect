import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageSquare, Calendar, Users } from "lucide-react";
import { ConversationItem } from "@/types/messaging";

interface MessagesTabsManagerProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  conversations: ConversationItem[];
  selectedId: string | undefined;
  onSelectConversation: (id: string) => void;
  getTabCount: (tab: string) => number;
}

export const MessagesTabsManager = ({
  activeTab,
  onTabChange,
  conversations,
  selectedId,
  onSelectConversation,
  getTabCount
}: MessagesTabsManagerProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="h-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="all" className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          Tutti
          <Badge variant="secondary" className="ml-1 text-xs">
            {getTabCount("all")}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="bookings" className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Prenotazioni
          <Badge variant="secondary" className="ml-1 text-xs">
            {getTabCount("bookings")}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="private" className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          Private
          <Badge variant="secondary" className="ml-1 text-xs">
            {getTabCount("private")}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="h-full mt-0">
        <ConversationSidebar
          conversations={conversations}
          selectedId={selectedId ?? ''}
          onSelect={onSelectConversation}
        />
      </TabsContent>
    </Tabs>
  );
};
