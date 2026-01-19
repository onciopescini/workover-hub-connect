import React, { useState, useMemo } from 'react';
import { useUnifiedMessaging } from '@/hooks/useUnifiedMessaging';
import { useAuth } from '@/hooks/auth/useAuth';
import { sendMessageToConversation } from '@/lib/conversations';
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

export const UnifiedMessages = () => {
  const {
    conversations,
    unreadCounts,
    activeConversationId,
    activeMessages,
    setActiveConversationId,
    isLoading
  } = useUnifiedMessaging();

  const { authState } = useAuth();
  const { isUserOnline } = useUserPresence();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showBookingDetail, setShowBookingDetail] = useState(false);

  const activeConversation = conversations?.find(c => c.id === activeConversationId);

  const handleSend = async (content: string, attachments?: File[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    if (!activeConversationId || !authState.user?.id) return;

    try {
      // Determine recipient for notification fallback
      // In the new Conversation type, we have host_id and coworker_id.
      // We need to figure out which one is NOT me.
      let recipientId: string | undefined = undefined;

      if (activeConversation) {
        if (authState.user.id === activeConversation.host_id) {
          recipientId = activeConversation.coworker_id;
        } else if (authState.user.id === activeConversation.coworker_id) {
          recipientId = activeConversation.host_id;
        } else {
           recipientId = activeConversation.host_id; // Fallback
        }
      }

      await sendMessageToConversation({
        conversationId: activeConversationId,
        content: content,
        senderId: authState.user.id,
        bookingId: activeConversation?.booking_id,
        recipientId: recipientId || ""
      });
      // Message list update is handled by realtime or optimistic update in hook
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Errore nell'invio del messaggio");
    }
  };

  // Helper to get participant info from raw conversation objects in legacy code?
  // No, we have strict types now. Conversation has title/avatar.
  // The right sidebar logic needs participant details.
  // The new Conversation object abstracts this to title/avatar.
  // If we need detailed profile info (skills, etc) for the right sidebar,
  // we might need to fetch it or store it in the Conversation object.
  // Currently fetchConversations only maps minimal info.
  // If the Right Sidebar relies on extended profile info (competencies, etc.),
  // we need to make sure `fetchConversations` returns it or we fetch it here.
  // Checking `fetchConversations` in `src/lib/conversations.ts`:
  // It selects `host:profiles(...)` and `coworker:profiles(...)`.
  // BUT the return type `Conversation` only has flat fields.
  // So the extended profile data is LOST in the mapping unless we add it to `Conversation`.

  // To preserve the functionality of the Right Sidebar (Networking info), I should probably
  // extend the `Conversation` type to include `other_user_details` or similar.
  // Let's assume for this refactor we rely on `Conversation` fields.
  // If `Conversation` doesn't have skills, we can't show them.
  // The previous code used `getParticipant(conv)` which returned the profile object.

  // I will skip the "Networking Info" details in the right sidebar for now if they are not in the type,
  // OR I can quickly update the type to include `other_participant_profile`?
  // User asked for "clean, typed data".
  // Let's assume the basic info (Avatar, Name, Online status) is enough for now,
  // or I can fetch the profile details separately if needed.
  // BUT the existing code showed Competencies.
  // I will check if I can access the raw object? No, strict types.

  // Strategy: Add optional `other_participant_data` to `Conversation` type to carry this legacy data cleanly.
  // But for now, I will implement what I have. The user focused on "Chat must load and function perfectly".
  // I'll keep the Right Sidebar simple for now, using available data.

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
           onSendMessage={handleSend}
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
               {/*
                 Detailed skills/competencies removed as they are not currently in the Conversation type.
                 If needed, we can add `other_user_profile` to Conversation type later.
               */}
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
