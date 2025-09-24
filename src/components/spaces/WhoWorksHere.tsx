import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, MessageCircle, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { useNetworking } from "@/hooks/useNetworking";
import { sendConnectionRequest, createOrGetPrivateChat } from "@/lib/networking-utils";
import { toast } from "sonner";

interface CoworkerProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string | null;
  bio?: string | null;
  profession?: string | null;
  networking_enabled: boolean;
  booking_count: number;
  last_booking_date: string;
}

interface WhoWorksHereProps {
  spaceId: string;
  className?: string;
}

export function WhoWorksHere({ spaceId, className = "" }: WhoWorksHereProps) {
  const { authState } = useAuth();
  const { hasConnectionRequest, fetchConnections } = useNetworking();
  const [coworkers, setCoworkers] = useState<CoworkerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());
  const [startingChats, setStartingChats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (spaceId && authState.user) {
      fetchCoworkers();
    }
  }, [spaceId, authState.user]);

  const fetchCoworkers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch other users who have booked this space (excluding current user)
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          user_id,
          booking_date,
          profiles:user_id (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio,
            profession,
            networking_enabled
          )
        `)
        .eq('space_id', spaceId)
        .eq('status', 'confirmed')
        .neq('user_id', authState.user?.id || '')
        .gte('booking_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .order('booking_date', { ascending: false });

      if (error) throw error;

      // Group by user and count bookings
      const userBookingMap = new Map<string, {
        profile: any;
        bookingCount: number;
        lastBookingDate: string;
      }>();

      data?.forEach((booking) => {
        const profile = booking.profiles;
        if (profile && profile.networking_enabled) {
          const userId = booking.user_id;
          const existing = userBookingMap.get(userId);
          
          if (existing) {
            existing.bookingCount += 1;
            if (booking.booking_date > existing.lastBookingDate) {
              existing.lastBookingDate = booking.booking_date;
            }
          } else {
            userBookingMap.set(userId, {
              profile: profile,
              bookingCount: 1,
              lastBookingDate: booking.booking_date
            });
          }
        }
      });

      // Convert to array and sort by booking count and recency
      const coworkersList = Array.from(userBookingMap.values())
        .map(({ profile, bookingCount, lastBookingDate }) => ({
          ...profile,
          booking_count: bookingCount,
          last_booking_date: lastBookingDate
        }))
        .sort((a, b) => {
          // First by booking count, then by recency
          if (b.booking_count !== a.booking_count) {
            return b.booking_count - a.booking_count;
          }
          return new Date(b.last_booking_date).getTime() - new Date(a.last_booking_date).getTime();
        })
        .slice(0, 6); // Show max 6 coworkers

      setCoworkers(coworkersList);
    } catch (error) {
      console.error('Error fetching coworkers:', error);
      toast.error('Errore nel caricamento dei coworker');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendConnectionRequest = async (userId: string) => {
    try {
      setSendingRequests(prev => new Set(prev).add(userId));
      const success = await sendConnectionRequest(userId);
      if (success) {
        await fetchConnections();
        toast.success('Richiesta di connessione inviata!');
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Errore nell\'invio della richiesta');
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      setStartingChats(prev => new Set(prev).add(userId));
      const chatId = await createOrGetPrivateChat(userId);
      if (chatId) {
        window.location.href = `/messages/private/${chatId}`;
      } else {
        toast.error("Impossibile avviare la chat");
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error("Errore nell'avvio della chat");
    } finally {
      setStartingChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatLastBooking = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} settimane fa`;
    return `${Math.ceil(diffDays / 30)} mesi fa`;
  };

  if (!authState.isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Chi lavora qui
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (coworkers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Chi lavora qui
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              Nessun coworker recente in questo spazio
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sii il primo a prenotare e connetterti!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Chi lavora qui
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {coworkers.length} coworker{coworkers.length !== 1 ? 's' : ''} hanno prenotato di recente
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {coworkers.map((coworker) => {
          const isConnected = hasConnectionRequest(coworker.id);
          const isSendingRequest = sendingRequests.has(coworker.id);
          const isStartingChat = startingChats.has(coworker.id);

          return (
            <div key={coworker.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <Avatar className="w-10 h-10">
                <AvatarImage src={coworker.profile_photo_url || undefined} />
                <AvatarFallback>
                  {getInitials(coworker.first_name, coworker.last_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">
                    {coworker.first_name} {coworker.last_name}
                  </h4>
                  {coworker.booking_count > 1 && (
                    <Badge variant="secondary" className="text-xs">
                      {coworker.booking_count} prenotazioni
                    </Badge>
                  )}
                </div>
                
                {coworker.profession && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {coworker.profession}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Ultima prenotazione: {formatLastBooking(coworker.last_booking_date)}
                </p>
                
                {coworker.bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {coworker.bio}
                  </p>
                )}
              </div>
              
              <div className="flex gap-1">
                {isConnected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartChat(coworker.id)}
                    disabled={isStartingChat}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Chat
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendConnectionRequest(coworker.id)}
                    disabled={isSendingRequest}
                    className="text-xs px-2 py-1 h-auto"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Connetti
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        
        {coworkers.length >= 6 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" className="text-xs">
              Vedi tutti i coworkers
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}