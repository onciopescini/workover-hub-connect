
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails, Message } from "@/types/booking";
import { Calendar, MessageSquare, User, Check, CheckCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingScreen from "@/components/LoadingScreen";

interface ConversationSummary {
  booking: BookingWithDetails;
  lastMessage: Message | null;
  unreadCount: number;
  userRole: "host" | "coworker";
}

export default function Messages() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!authState.user) return;

      try {
        setIsLoading(true);

        // Get all bookings for the user (both as host and coworker)
        const { data: coworkerBookings, error: coworkerError } = await supabase
          .from("bookings")
          .select(`
            *,
            space:space_id (
              title,
              address,
              photos,
              host_id
            ),
            coworker:user_id (
              first_name,
              last_name,
              profile_photo_url
            )
          `)
          .eq("user_id", authState.user.id)
          .in("status", ["pending", "confirmed"]); // Only active bookings

        if (coworkerError) throw coworkerError;

        // Get host bookings if user is a host
        let hostBookings: any[] = [];
        if (authState.profile?.role === "host") {
          const { data: userSpaces } = await supabase
            .from("spaces")
            .select("id")
            .eq("host_id", authState.user.id);

          if (userSpaces && userSpaces.length > 0) {
            const spaceIds = userSpaces.map(s => s.id);
            
            const { data: hostBookingsData } = await supabase
              .from("bookings")
              .select(`
                *,
                space:space_id (
                  title,
                  address,
                  photos,
                  host_id
                ),
                coworker:user_id (
                  first_name,
                  last_name,
                  profile_photo_url
                )
              `)
              .in("space_id", spaceIds)
              .neq("user_id", authState.user.id)
              .in("status", ["pending", "confirmed"]);

            hostBookings = hostBookingsData || [];
          }
        }

        const allBookings = [...(coworkerBookings || []), ...hostBookings];
        const uniqueBookings = allBookings.filter((booking, index, self) => 
          index === self.findIndex(b => b.id === booking.id)
        ) as unknown as BookingWithDetails[];

        // For each booking, get the last message and unread count
        const conversationPromises = uniqueBookings.map(async (booking) => {
          // Get last message
          const { data: lastMessageData } = await supabase
            .from("messages")
            .select(`
              *,
              sender:profiles!sender_id (
                first_name,
                last_name,
                profile_photo_url
              )
            `)
            .eq("booking_id", booking.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const lastMessage = lastMessageData?.[0] as unknown as Message || null;

          // Get unread count (messages not sent by current user and not read)
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("booking_id", booking.id)
            .neq("sender_id", authState.user.id)
            .eq("is_read", false);

          const userRole = authState.user.id === booking.space?.host_id ? "host" : "coworker";

          return {
            booking,
            lastMessage,
            unreadCount: unreadCount || 0,
            userRole
          };
        });

        const conversationData = await Promise.all(conversationPromises);
        
        // Sort by last message timestamp
        conversationData.sort((a, b) => {
          const aTime = a.lastMessage?.created_at || a.booking.created_at || "";
          const bTime = b.lastMessage?.created_at || b.booking.created_at || "";
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setConversations(conversationData);

      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Errore nel caricamento delle conversazioni");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [authState.user, authState.profile]);

  const getOtherParty = (conversation: ConversationSummary) => {
    if (conversation.userRole === "host") {
      return {
        name: `${conversation.booking.coworker?.first_name} ${conversation.booking.coworker?.last_name}`,
        photo: conversation.booking.coworker?.profile_photo_url
      };
    } else {
      return {
        name: conversation.booking.space?.title || "Host",
        photo: null
      };
    }
  };

  const formatLastMessageTime = (message: Message | null) => {
    if (!message) return "";
    return format(new Date(message.created_at), "HH:mm", { locale: it });
  };

  const getMessagePreview = (message: Message | null) => {
    if (!message) return "Nessun messaggio";
    if (message.content) return message.content.substring(0, 50) + (message.content.length > 50 ? "..." : "");
    if (message.attachments && message.attachments.length > 0) return "📎 Allegato";
    return "Messaggio";
  };

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <h1 className="text-xl font-semibold text-gray-900">Messaggi</h1>
          <p className="text-sm text-gray-600">Le tue conversazioni attive</p>
        </div>
      </div>

      {/* Conversations list */}
      <div className="max-w-2xl mx-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna conversazione
            </h3>
            <p className="text-gray-600 text-center">
              Non hai ancora conversazioni attive. Le conversazioni si aprono automaticamente quando effettui o ricevi una prenotazione.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conversation) => {
              const otherParty = getOtherParty(conversation);
              const bookingDate = format(new Date(conversation.booking.booking_date), "d MMM", { locale: it });
              
              return (
                <div
                  key={conversation.booking.id}
                  className="bg-white p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/messages/${conversation.booking.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={otherParty.photo || undefined} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {otherParty.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatLastMessageTime(conversation.lastMessage)}
                            </span>
                          )}
                          {conversation.unreadCount > 0 && (
                            <div className="bg-[#22C55E] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 truncate">
                          {getMessagePreview(conversation.lastMessage)}
                        </p>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{bookingDate}</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        {conversation.booking.space?.title} • {conversation.userRole === "host" ? "Host" : "Coworker"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
