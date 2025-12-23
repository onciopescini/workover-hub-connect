import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useUnifiedMessaging } from '@/hooks/useUnifiedMessaging';
import { useAuth } from '@/hooks/auth/useAuth';
import { sendMessageToConversation } from '@/lib/conversations';
import { useUserPresence } from '@/hooks/useUserPresence';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, User, Calendar, MapPin, MoreVertical, Phone, ArrowLeft, Loader2, Filter, Eye } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { OnlineStatusIndicator } from './OnlineStatusIndicator';
import { BookingDetailDialog } from './BookingDetailDialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterType = 'all' | 'booking' | 'networking' | 'unread';

// Helper to safely render potentially malformed data
const safeRender = (value: any, fallback = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    console.warn("UnifiedMessages: Attempted to render object", value);
    // Try to extract common text fields if it's an object
    if (value.content && typeof value.content === 'string') return value.content;
    if (value.message && typeof value.message === 'string') return value.message;
    return fallback || "[Contenuto non valido]";
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

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showBookingDetail, setShowBookingDetail] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Mark as read in background when conversation becomes active
  useEffect(() => {
    // Logic handled in hook via setActiveConversationId,
    // but we ensure side effects here if needed
  }, [activeConversationId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversationId || !authState.user?.id) return;

    setIsSending(true);
    try {
      await sendMessageToConversation({
        conversationId: activeConversationId,
        content: newMessage,
        senderId: authState.user.id,
        bookingId: activeConversation?.booking_id
      });
      setNewMessage("");
    } catch (error) {
      toast.error("Errore nell'invio del messaggio");
    } finally {
      setIsSending(false);
    }
  };

  const getParticipant = (conv: any) => {
    if (!authState.user?.id) return null;
    return conv.host_id === authState.user.id ? conv.coworker : conv.host;
  };

  // Filtering Logic
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
       const isBooking = !!conv.booking_id;
       const unread = unreadCounts[conv.id] || 0;

       switch (filter) {
         case 'booking': return isBooking;
         case 'networking': return !isBooking;
         case 'unread': return unread > 0;
         default: return true;
       }
    });
  }, [conversations, filter, unreadCounts]);

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
               onClick={() => setFilter('all')}
             >
               Tutti
             </Button>
             <Button
               variant={filter === 'booking' ? 'default' : 'ghost'}
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => setFilter('booking')}
             >
               Prenotazioni
             </Button>
             <Button
               variant={filter === 'networking' ? 'default' : 'ghost'}
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => setFilter('networking')}
             >
               Networking
             </Button>
             <Button
               variant={filter === 'unread' ? 'default' : 'ghost'}
               size="sm"
               className="text-xs h-7 px-2"
               onClick={() => setFilter('unread')}
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
                 const participant = getParticipant(conv);
                 const unread = unreadCounts[conv.id] || 0;
                 const isBooking = !!conv.booking_id;
                 const isOnline = participant ? isUserOnline(participant.id) : false;

                 return (
                   <div
                     key={conv.id}
                     onClick={() => setActiveConversationId(conv.id)}
                     className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors border-b last:border-0 ${activeConversationId === conv.id ? 'bg-accent' : ''}`}
                   >
                     <div className="relative">
                       <Avatar>
                         <AvatarImage src={participant?.profile_photo_url} />
                         <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                       </Avatar>
                       {isOnline && (
                         <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                       )}
                     </div>

                     <div className="flex-1 overflow-hidden">
                       <div className="flex justify-between items-center mb-1">
                         <span className="font-medium truncate text-sm">
                           {participant?.first_name} {participant?.last_name}
                         </span>
                         {unread > 0 && (
                           <span className="h-2 w-2 rounded-full bg-blue-600 ml-2" />
                         )}
                       </div>

                       <div className="flex items-center gap-2 mb-1">
                         <Badge variant={isBooking ? "secondary" : "outline"} className="text-[10px] h-5 px-1.5">
                           {isBooking ? (conv.space?.name || "PRENOTAZIONE") : "NETWORKING"}
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

      {/* CENTER: Chat Area */}
      <div className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50/50`}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-background flex items-center gap-3 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveConversationId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getParticipant(activeConversation)?.profile_photo_url} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                 {getParticipant(activeConversation) && isUserOnline(getParticipant(activeConversation).id) && (
                   <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
                 )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-sm">
                  {getParticipant(activeConversation)?.first_name} {getParticipant(activeConversation)?.last_name}
                </h3>
                {activeConversation.booking_id && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {activeConversation.booking?.booking_date ? format(new Date(activeConversation.booking.booking_date), 'dd MMMM yyyy', { locale: it }) : 'Data sconosciuta'}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
              <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                {activeMessages.map((msg) => {
                  const isMe = msg.sender_id === authState.user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm
                        ${isMe
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-white border text-foreground rounded-tl-sm'}
                      `}>
                        {safeRender(msg.content)}
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 bg-background border-t mt-auto">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Scrivi un messaggio..."
                  className="flex-1 bg-muted/20"
                  disabled={isSending}
                />
                <Button onClick={handleSend} disabled={isSending || !newMessage.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
               <Send className="h-8 w-8 text-slate-400" />
            </div>
            <p>Seleziona una conversazione per iniziare</p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Context (Desktop only) */}
      {activeConversation && (
        <div className="hidden lg:flex w-80 border-l bg-background flex-col p-6 space-y-6">
          <div className="text-center">
            <div className="relative inline-block">
              <Avatar className="h-20 w-20 mx-auto mb-4">
                <AvatarImage src={getParticipant(activeConversation)?.profile_photo_url} />
                <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
              </Avatar>
              {getParticipant(activeConversation) && isUserOnline(getParticipant(activeConversation).id) && (
                 <span className="absolute bottom-4 right-0 h-5 w-5 rounded-full bg-green-500 border-4 border-background"></span>
              )}
            </div>
            <h3 className="font-semibold text-lg">
              {getParticipant(activeConversation)?.first_name} {getParticipant(activeConversation)?.last_name}
            </h3>
            <p className="text-sm text-muted-foreground">Utente verificato</p>
          </div>

          <Separator />

          {activeConversation.booking_id ? (
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

               {/* Skills / Competencies */}
               {(getParticipant(activeConversation)?.competencies || getParticipant(activeConversation)?.skills) && (
                 <div>
                   <h5 className="text-xs font-semibold mb-2">Competenze & Tags</h5>
                   <div className="flex flex-wrap gap-1">
                     {Array.isArray(getParticipant(activeConversation)?.competencies) &&
                      getParticipant(activeConversation)?.competencies.map((skill: any, idx: number) => {
                        // Ensure skill is a string before rendering
                        if (typeof skill !== 'string') return null;
                        return (
                          <Badge key={idx} variant="secondary" className="text-[10px]">
                            {skill}
                          </Badge>
                        );
                      })}
                     {/* Fallback to skills string if competencies is empty */}
                     {(!getParticipant(activeConversation)?.competencies || getParticipant(activeConversation)?.competencies?.length === 0) && getParticipant(activeConversation)?.skills && (
                       <Badge variant="secondary" className="text-[10px]">
                         {safeRender(getParticipant(activeConversation).skills)}
                       </Badge>
                     )}
                   </div>
                 </div>
               )}
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
