
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageSquare, Calendar, Users } from "lucide-react";
import { ConversationItem } from "@/types/messaging";
import { useUnreadCount } from "@/hooks/useUnreadCount";

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
  const { counts: unreadCounts } = useUnreadCount();
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col min-h-0 overflow-hidden">
        {/* Fixed header with tabs */}
        <div className="flex-shrink-0">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm min-w-0 px-1 sm:px-3">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Tutti</span>
              <span className="sm:hidden truncate">All</span>
              <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                <Badge variant="secondary" className="text-xs min-w-[1.5rem] h-5 px-1.5">
                  {getTabCount("all")}
                </Badge>
                {unreadCounts.total > 0 && (
                  <Badge variant="destructive" className="w-5 h-5 text-xs p-0 flex items-center justify-center flex-shrink-0">
                    {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm min-w-0 px-1 sm:px-3">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Prenotazioni</span>
              <span className="sm:hidden truncate">Book</span>
              <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                <Badge variant="secondary" className="text-xs min-w-[1.5rem] h-5 px-1.5">
                  {getTabCount("bookings")}
                </Badge>
                {unreadCounts.bookingMessages > 0 && (
                  <Badge variant="destructive" className="w-5 h-5 text-xs p-0 flex items-center justify-center flex-shrink-0">
                    {unreadCounts.bookingMessages > 99 ? '99+' : unreadCounts.bookingMessages}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm min-w-0 px-1 sm:px-3">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Private</span>
              <span className="sm:hidden truncate">Prv</span>
              <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                <Badge variant="secondary" className="text-xs min-w-[1.5rem] h-5 px-1.5">
                  {getTabCount("private")}
                </Badge>
                {unreadCounts.privateMessages > 0 && (
                  <Badge variant="destructive" className="w-5 h-5 text-xs p-0 flex items-center justify-center flex-shrink-0">
                    {unreadCounts.privateMessages > 99 ? '99+' : unreadCounts.privateMessages}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Flexible content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value={activeTab} className="h-full mt-0 overflow-hidden">
            <ConversationSidebar
              conversations={conversations}
              selectedId={selectedId ?? ''}
              onSelect={onSelectConversation}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
