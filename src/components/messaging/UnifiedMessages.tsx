import React, { useState, useMemo } from 'react';
import { useUnifiedMessaging } from '@/hooks/useUnifiedMessaging';
import { useAuth } from '@/hooks/auth/useAuth';
import { useUserPresence } from '@/hooks/useUserPresence';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, MapPin, Loader2, Eye } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { BookingDetailDialog } from './BookingDetailDialog';
import { ConversationList, FilterType } from './ConversationList';
import { MessagesChatArea } from './MessagesChatArea';

export const UnifiedMessages = () => {
  const {
    conversations,
    unreadCounts,
    activeConversationId,
    activeMessages,
    setActiveConversationId,
    isLoading,
    isMessagesLoading,
    sendMessage
  } = useUnifiedMessaging();

  const { authState } = useAuth();
  const { isUserOnline } = useUserPresence();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showBookingDetail, setShowBookingDetail] = useState(false);

  const activeConversation = conversations?.find(c => c.id === activeConversationId);

  // We no longer define handleSend locally, but delegate to the hook's sendMessage

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full bg-background border rounded-lg overflow-hidden shadow-sm">
      {/* LEFT SIDEBAR: Conversations List */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        unreadCounts={unreadCounts}
        isLoading={isLoading}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* CENTER: Chat Area */}
      <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50/50`}>
         <MessagesChatArea
           selectedConversation={activeConversation}
           messages={activeMessages}
           currentUserId={authState.user?.id}
           currentUserProfilePhoto={authState.user?.user_metadata?.avatar_url || authState.user?.user_metadata?.profile_photo_url}
           onSendMessage={sendMessage}
           isLoading={isMessagesLoading}
         />
      </div>

      {/* RIGHT SIDEBAR: Context (Desktop only) */}
      {activeConversation && (
        <div className="hidden lg:flex w-80 border-l bg-background flex-col p-6 space-y-6">
          <div className="text-center">
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 mx-auto mb-4">
                <AvatarImage src={activeConversation.avatar} />
                <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
              </Avatar>
              {activeConversation.other_user_id && isUserOnline(activeConversation.other_user_id) && (
                 <span className="absolute bottom-4 right-0 h-5 w-5 rounded-full bg-green-500 border-4 border-background"></span>
              )}
            </div>
            <h3 className="font-semibold text-lg">
              {activeConversation.title}
            </h3>
            <p className="text-sm text-muted-foreground">
               {/* "Utente verificato" or role */}
               Utente
            </p>
          </div>

          <Separator />

          {activeConversation.type === 'booking' ? (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Dettagli Prenotazione</h4>
              <div className="bg-accent/30 p-4 rounded-lg space-y-3 text-sm">
                <div className="flex items-start gap-3">
                   <MapPin className="h-4 w-4 text-primary mt-0.5" />
                   <span className="font-medium">{activeConversation.space?.name || "Spazio"}</span>
                </div>
                <div className="flex items-center gap-3">
                   <Calendar className="h-4 w-4 text-primary" />
                   <span>
                      {activeConversation.booking?.booking_date
                        ? format(new Date(activeConversation.booking.booking_date), 'dd MMM yyyy', { locale: it })
                        : '-'}
                   </span>
                </div>
                {activeConversation.booking?.status && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={activeConversation.booking.status === 'confirmed' ? 'default' : 'secondary'}>
                      {activeConversation.booking.status === 'confirmed' ? 'Confermata' : activeConversation.booking.status}
                    </Badge>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full mt-2"
                  size="sm"
                  onClick={() => setShowBookingDetail(true)}
                >
                  <Eye className="w-3 h-3 mr-2" />
                  Vedi Dettagli
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Info Networking</h4>
               <p className="text-sm text-muted-foreground mb-4">
                 Questa è una conversazione privata di networking.
               </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <BookingDetailDialog
        isOpen={showBookingDetail}
        onClose={() => setShowBookingDetail(false)}
        booking={activeConversation?.booking ? { ...activeConversation.booking, space: activeConversation.space } : null}
      />
    </div>
  );
};

export default UnifiedMessages;
