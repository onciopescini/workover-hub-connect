import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Calendar, 
  MapPin, 
  Euro, 
  ExternalLink,
  Building2,
  User,
  Briefcase,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface ChatDetailsPanelProps {
  conversation: Conversation | undefined;
  currentUserId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  job_title: string | null;
  skills: string | null;
  interests: string | null;
  location: string | null;
}

interface SharedHistoryItem {
  space_title: string;
  booking_date: string;
}

const getStatusColor = (status: string | undefined) => {
  switch (status) {
    case 'confirmed': return 'bg-green-500/10 text-green-700 border-green-500/20';
    case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-700 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusLabel = (status: string | undefined) => {
  switch (status) {
    case 'confirmed': return 'Confermata';
    case 'pending': return 'In attesa';
    case 'cancelled': return 'Annullata';
    default: return status || 'N/A';
  }
};

// Content component to avoid duplication
const PanelContent: React.FC<{
  conversation: Conversation | undefined;
  currentUserId: string | undefined;
  onClose: () => void;
  showCloseButton?: boolean;
}> = ({ conversation, currentUserId, onClose, showCloseButton = true }) => {
  const isBookingChat = !!conversation?.booking_id && !!conversation?.booking;
  
  // Get the other participant's ID
  const otherParticipant = conversation?.participants?.find(p => p.id !== currentUserId);
  const otherUserId = otherParticipant?.id;

  // Fetch user profile for networking chats
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile', otherUserId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!otherUserId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, bio, job_title, skills, interests, location')
        .eq('id', otherUserId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data;
    },
    enabled: !isBookingChat && !!otherUserId,
  });

  // Fetch shared history for networking chats using direct query
  const { data: sharedHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['shared-history', currentUserId, otherUserId],
    queryFn: async (): Promise<SharedHistoryItem[]> => {
      if (!currentUserId || !otherUserId) return [];
      
      // First get the other user's bookings with space IDs
      const { data: otherUserBookings, error: otherError } = await supabase
        .from('bookings')
        .select('space_id, booking_date')
        .eq('user_id', otherUserId);
      
      if (otherError || !otherUserBookings?.length) {
        return [];
      }
      
      const otherSpaceIds = [...new Set(otherUserBookings.map(b => b.space_id).filter(Boolean))];
      
      if (otherSpaceIds.length === 0) return [];
      
      // Find current user's bookings at those same spaces
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          booking_date,
          space:spaces(title)
        `)
        .eq('user_id', currentUserId)
        .in('space_id', otherSpaceIds as string[])
        .order('booking_date', { ascending: false })
        .limit(5);
      
      if (error) {
        console.warn('Error fetching shared history:', error.message);
        return [];
      }
      
      // Transform to SharedHistoryItem format
      return (data || []).map(item => ({
        space_title: (item.space as { title: string } | null)?.title || 'Spazio',
        booking_date: item.booking_date
      }));
    },
    enabled: !isBookingChat && !!currentUserId && !!otherUserId,
  });

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Seleziona una conversazione
      </div>
    );
  }

  const displayName = otherParticipant
    ? `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || 'Utente'
    : 'Utente';

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header with close button */}
        {showCloseButton && (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Dettagli</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {isBookingChat ? (
          // =========== BOOKING CONTEXT ===========
          <div className="space-y-4">
            {/* Space Info */}
            {conversation.space && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Spazio</span>
                </div>
                <p className="font-semibold">{conversation.space.title || 'N/A'}</p>
                {conversation.space.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{conversation.space.address}</span>
                  </div>
                )}
                {conversation.space.price_per_hour && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Euro className="h-3 w-3" />
                    <span>€{conversation.space.price_per_hour}/ora</span>
                  </div>
                )}
                {conversation.space_id && (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/spaces/${conversation.space_id}`}>
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Vai allo Spazio
                    </Link>
                  </Button>
                )}
              </div>
            )}

            <Separator />

            {/* Booking Info */}
            {conversation.booking && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Prenotazione</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Data</span>
                    <span className="text-sm font-medium">
                      {conversation.booking.booking_date
                        ? format(new Date(conversation.booking.booking_date), 'dd MMMM yyyy', { locale: it })
                        : 'N/A'}
                    </span>
                  </div>
                  
                  {(conversation.booking.start_time || conversation.booking.end_time) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Orario</span>
                      <span className="text-sm font-medium">
                        {conversation.booking.start_time?.slice(0, 5) || '--'} - {conversation.booking.end_time?.slice(0, 5) || '--'}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stato</span>
                    <Badge variant="outline" className={getStatusColor(conversation.booking.status)}>
                      {getStatusLabel(conversation.booking.status)}
                    </Badge>
                  </div>
                </div>

                {conversation.booking_id && (
                  <Button variant="default" size="sm" className="w-full mt-2" asChild>
                    <Link to={`/bookings`}>
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Vedi Prenotazione
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          // =========== NETWORKING CONTEXT ===========
          <div className="space-y-4">
            {/* User Profile Card */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userProfile?.profile_photo_url || otherParticipant?.profile_photo_url || ''} />
                  <AvatarFallback className="text-lg">
                    {displayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{displayName}</h4>
                  {userProfile?.job_title && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {userProfile.job_title}
                    </p>
                  )}
                  {userProfile?.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {userProfile.location}
                    </p>
                  )}
                </div>
              </div>

              {userProfile?.bio && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Bio
                    </p>
                    <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
                  </div>
                </>
              )}

              {userProfile?.skills && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Competenze</p>
                    <div className="flex flex-wrap gap-1">
                      {userProfile.skills.split(',').map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {userProfile?.interests && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">Interessi</p>
                    <p className="text-sm text-muted-foreground">{userProfile.interests}</p>
                  </div>
                </>
              )}

              {otherUserId && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to={`/profile/${otherUserId}`}>
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Vedi Profilo
                  </Link>
                </Button>
              )}
            </div>

            {/* Shared History */}
            {!isHistoryLoading && sharedHistory && sharedHistory.length > 0 && (
              <>
                <Separator />
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Dove vi siete incontrati</span>
                  </div>
                  <div className="space-y-2">
                    {sharedHistory.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {item.space_title} • {format(new Date(item.booking_date), 'dd MMM yyyy', { locale: it })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isProfileLoading && (
              <div className="flex justify-center py-4">
                <span className="text-sm text-muted-foreground">Caricamento profilo...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export const ChatDetailsPanel: React.FC<ChatDetailsPanelProps> = ({
  conversation,
  currentUserId,
  isOpen,
  onClose,
}) => {
  const isMobile = useIsMobile();

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Dettagli Conversazione</DrawerTitle>
          </DrawerHeader>
          <PanelContent 
            conversation={conversation} 
            currentUserId={currentUserId} 
            onClose={onClose}
            showCloseButton={false}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Inline Panel
  if (!isOpen) return null;

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      <PanelContent 
        conversation={conversation} 
        currentUserId={currentUserId} 
        onClose={onClose}
      />
    </div>
  );
};
