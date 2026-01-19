
import React, { useMemo } from 'react';
import { Conversation } from '@/types/messaging';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useUserPresence } from '@/hooks/useUserPresence';

// Helper to safely render potentially malformed data
const safeRender = (value: any, fallback = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Try to extract common text fields if it's an object
    if (value.content && typeof value.content === 'string') return value.content;
    if (value.message && typeof value.message === 'string') return value.message;
    if (value.label && typeof value.label === 'string') return value.label;
    return fallback || "";
  }
  return String(value);
};

export type FilterType = 'all' | 'booking' | 'networking' | 'unread';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  unreadCounts,
  filter,
  onFilterChange
}) => {
  const { isUserOnline } = useUserPresence();

  // Filtering Logic
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
       if (!conv) return false;
       const isBooking = conv.type === 'booking';
       const unread = unreadCounts[conv.id] || 0;

       switch (filter) {
         case 'booking': return isBooking;
         case 'networking': return !isBooking;
         case 'unread': return unread > 0;
         default: return true;
       }
    });
  }, [conversations, filter, unreadCounts]);

  return (
    <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r`}>
        <div className="p-4 border-b space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Messaggi</h2>
          </div>

          {/* Filters */}
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
             <Button
               variant={filter === 'all' ? 'default' : 'ghost'}
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => onFilterChange('all')}
             >
               Tutti
             </Button>
             <Button
               variant={filter === 'booking' ? 'default' : 'ghost'}
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => onFilterChange('booking')}
             >
               Prenotazioni
             </Button>
             <Button
               variant={filter === 'networking' ? 'default' : 'ghost'}
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => onFilterChange('networking')}
             >
               Networking
             </Button>
             <Button
               variant={filter === 'unread' ? 'default' : 'ghost'}
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => onFilterChange('unread')}
             >
               Non letti
             </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {filteredConversations.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground text-sm">
                 Nessuna conversazione trovata.
               </div>
            ) : (
               filteredConversations.map((conv) => {
                 // In the new Conversation type, we have "title" and "avatar" pre-calculated
                 const unread = unreadCounts[conv.id] || 0;
                 const isBooking = conv.type === 'booking';

                 // We need to know who the "other" person is for online status.
                 // The Conversation object doesn't explicitly have "otherParticipantId" but we can infer it or use is_online prop (which will be populated by realtime eventually)
                 // For now, let's use the ID that is NOT the current user, but we don't have current user ID here easily.
                 // However, the `Conversation` type I defined doesn't have `host` or `coworker` objects, just `title` and `avatar`.
                 // But wait, `isUserOnline` takes a userId.
                 // In `fetchConversations` I mapped `title` and `avatar`.
                 // I should probably include `other_user_id` in the `Conversation` type to make this easier.
                 // Let's check the type definition again.
                 // It has `host_id` and `coworker_id`.

                 // We don't have authState here to know who "me" is to pick the OTHER id.
                 // BUT, `fetchConversations` logic was:
                 // const otherPerson = isHost ? c.coworker : c.host;
                 // It would be cleaner if `Conversation` had `other_user_id`.

                 // For now, I will use a simple heuristic or rely on `is_online` if I add it to `Conversation`.
                 // Actually, `useUserPresence` hook is client side.
                 // Let's assume for now we can't easily do online status in this list without knowing "me".
                 // BUT `UnifiedMessages` knows "me".
                 // Maybe I should pass "currentUserId" to `ConversationList`?

                 return (
                   <div
                     key={conv.id}
                     onClick={() => onSelectConversation(conv.id)}
                     className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors border-b last:border-0 ${activeConversationId === conv.id ? 'bg-accent' : ''}`}
                   >
                     <div className="relative">
                       <Avatar>
                         <AvatarImage src={conv.avatar} />
                         <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                       </Avatar>
                       {conv.other_user_id && isUserOnline(conv.other_user_id) && (
                         <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                       )}
                     </div>

                     <div className="flex-1 overflow-hidden">
                       <div className="flex justify-between items-center mb-1">
                         <span className="font-medium truncate text-sm">
                           {conv.title}
                         </span>
                         {unread > 0 && (
                           <span className="h-2 w-2 rounded-full bg-blue-600 ml-2" />
                         )}
                       </div>

                       <div className="flex items-center gap-2 mb-1">
                         <Badge variant={isBooking ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5">
                           {conv.subtitle}
                         </Badge>
                         <span className="text-[10px] text-muted-foreground">
                           {conv.last_message_at ? format(new Date(conv.last_message_at), 'dd MMM', { locale: it }) : ''}
                         </span>
                       </div>

                       <p className={`text-xs truncate ${unread > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                         {safeRender(conv.last_message, "Nessun messaggio")}
                       </p>
                     </div>
                   </div>
                 );
               })
            )}
          </div>
        </ScrollArea>
    </div>
  );
};
