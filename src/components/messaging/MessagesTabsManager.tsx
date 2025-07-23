
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
    <div className="h-full flex flex-col min-h-0">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
          <TabsTrigger value="all" className="flex items-center gap-1 text-xs sm:text-sm">
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Tutti</span>
            <span className="sm:hidden">All</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {getTabCount("all")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-1 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Prenotazioni</span>
            <span className="sm:hidden">Book</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {getTabCount("bookings")}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="private" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Private</span>
            <span className="sm:hidden">Prv</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {getTabCount("private")}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 mt-0 min-h-0">
          <ConversationSidebar
            conversations={conversations}
            selectedId={selectedId ?? ''}
            onSelect={onSelectConversation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
