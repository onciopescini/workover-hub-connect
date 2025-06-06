
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Send, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { fetchBookingMessages } from "@/lib/message-utils";
import { useBookings } from "@/hooks/useBookings";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface BookingWithHost {
  id: string;
  status: string;
  booking_date: string;
  space_id: string;
  user_id: string;
  space?: {
    id: string;
    title: string;
    host_id: string;
    host?: {
      id: string;
      first_name: string;
      last_name: string;
      profile_photo_url?: string;
    };
  };
}

const Messages = () => {
  const { authState } = useAuth();
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingsWithHosts, setBookingsWithHosts] = useState<BookingWithHost[]>([]);

  // Fetch bookings with host information
  useEffect(() => {
    const fetchBookingsWithHosts = async () => {
      if (!authState.user?.id) return;

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(`
            *,
            space:spaces (
              id,
              title,
              host_id,
              host:profiles!host_id (
                id,
                first_name,
                last_name,
                profile_photo_url
              )
            )
          `)
          .eq("user_id", authState.user.id)
          .in("status", ["confirmed", "pending"])
          .order("created_at", { ascending: false });

        if (error) throw error;

        setBookingsWithHosts(data || []);
      } catch (error) {
        console.error("Error fetching bookings with hosts:", error);
      }
    };

    fetchBookingsWithHosts();
  }, [authState.user?.id]);

  // Get messages for selected booking
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['booking-messages', selectedBookingId],
    queryFn: () => selectedBookingId ? fetchBookingMessages(selectedBookingId) : Promise.resolve([]),
    enabled: !!selectedBookingId,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time feel
  });

  // Filter bookings by search
  const filteredBookings = bookingsWithHosts.filter(booking =>
    booking.space?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (booking.space?.host?.first_name + ' ' + booking.space?.host?.last_name)
      .toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select first booking if none selected
  useEffect(() => {
    if (!selectedBookingId && filteredBookings.length > 0) {
      setSelectedBookingId(filteredBookings[0].id);
    }
  }, [selectedBookingId, filteredBookings]);

  const selectedBooking = bookingsWithHosts.find(b => b.id === selectedBookingId);

  const getUserRole = (booking: BookingWithHost) => {
    return authState.user?.id === booking.space?.host_id ? "host" : "coworker";
  };

  const getOtherPartyName = (booking: BookingWithHost) => {
    const userRole = getUserRole(booking);
    if (userRole === "host") {
      // Host sees coworker's name - we need to get coworker profile
      return "Coworker"; // Simplified for now
    } else {
      // Coworker sees host's name
      const host = booking.space?.host;
      return host ? `${host.first_name} ${host.last_name}` : "Host";
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedBookingId) return;
    
    // Here you would implement sendBookingMessage
    console.log('Sending message:', newMessage, 'to booking:', selectedBookingId);
    setNewMessage("");
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Accedi per vedere i messaggi
            </h3>
            <p className="text-gray-600">
              Devi effettuare l'accesso per visualizzare e inviare messaggi.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messaggi</h1>
          <p className="text-gray-600">
            Comunica con host e coworker per le tue prenotazioni
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversazioni
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca conversazioni..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {filteredBookings.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Nessuna conversazione attiva</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className={`p-4 cursor-pointer border-b hover:bg-gray-50 ${
                          selectedBookingId === booking.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => setSelectedBookingId(booking.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={booking.space?.host?.profile_photo_url || ""} />
                            <AvatarFallback>
                              {getOtherPartyName(booking).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900 truncate">
                                {getOtherPartyName(booking)}
                              </p>
                              <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                                {booking.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {booking.space?.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(booking.booking_date), {
                                addSuffix: true,
                                locale: it
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="lg:col-span-2">
            {selectedBooking ? (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedBooking.space?.host?.profile_photo_url || ""} />
                      <AvatarFallback>
                        {getOtherPartyName(selectedBooking).charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {getOtherPartyName(selectedBooking)}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {selectedBooking.space?.title}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex flex-col h-96">
                  {/* Messages */}
                  <ScrollArea className="flex-1 mb-4">
                    {isLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        Caricamento messaggi...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>Nessun messaggio ancora</p>
                        <p className="text-sm">Inizia la conversazione!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 p-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.sender_id === authState.user?.id ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.sender_id === authState.user?.id
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-900'
                              }`}
                            >
                              <p>{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.sender_id === authState.user?.id ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {formatDistanceToNow(new Date(message.created_at), {
                                  addSuffix: true,
                                  locale: it
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Scrivi un messaggio..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Seleziona una conversazione</p>
                  <p>Scegli una prenotazione per iniziare a chattare</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messages;
