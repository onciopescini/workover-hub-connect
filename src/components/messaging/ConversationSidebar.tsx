
import React from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationItem } from "@/types/messaging";
import { ModernConversationItem } from "./ModernConversationItem";
import { MessageSquare } from "lucide-react";

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
  return (
    <Card className="h-full flex flex-col overflow-hidden border-border">
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground p-4">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Nessuna conversazione</p>
            <p className="text-xs mt-1">Le tue chat appariranno qui</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {conversations.map((conversation) => (
              <ModernConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedId}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
