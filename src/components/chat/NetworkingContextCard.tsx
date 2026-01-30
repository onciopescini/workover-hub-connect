import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SharedHistoryItem } from '@/types/chat';
import { MapPin, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface NetworkingContextCardProps {
  currentUserId: string;
  otherUserId: string;
}

async function fetchSharedHistory(userA: string, userB: string): Promise<SharedHistoryItem[]> {
  // Find bookings where both users were at the same space on the same date
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      booking_date,
      space:spaces(title)
    `)
    .eq('user_id', userA)
    .in('status', ['confirmed', 'served', 'checked_in']);

  if (error || !data) return [];

  // Get bookings for userB
  const { data: userBBookings } = await supabase
    .from('bookings')
    .select(`
      booking_date,
      space_id,
      space:spaces(title)
    `)
    .eq('user_id', userB)
    .in('status', ['confirmed', 'served', 'checked_in']);

  if (!userBBookings) return [];

  // Find intersections (same space, same date)
  const userADates = new Set(data.map(b => `${b.booking_date}`));
  const sharedHistory: SharedHistoryItem[] = [];

  for (const bBooking of userBBookings) {
    if (userADates.has(bBooking.booking_date) && bBooking.space) {
      // Check if user A was also at this space on this date
      const matchingA = data.find(a => 
        a.booking_date === bBooking.booking_date && 
        a.space?.title === bBooking.space?.title
      );
      
      if (matchingA && matchingA.space) {
        sharedHistory.push({
          space_title: matchingA.space.title,
          booking_date: bBooking.booking_date
        });
      }
    }
  }

  // Remove duplicates and limit to 3
  const uniqueHistory = sharedHistory.filter((item, index, self) =>
    index === self.findIndex(t => t.space_title === item.space_title && t.booking_date === item.booking_date)
  ).slice(0, 3);

  return uniqueHistory;
}

export const NetworkingContextCard: React.FC<NetworkingContextCardProps> = ({ 
  currentUserId, 
  otherUserId 
}) => {
  const { data: sharedHistory, isLoading } = useQuery({
    queryKey: ['shared-history', currentUserId, otherUserId],
    queryFn: () => fetchSharedHistory(currentUserId, otherUserId),
    enabled: !!currentUserId && !!otherUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-muted/50 rounded-lg p-3 mb-2 border border-border/50">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
    );
  }

  if (!sharedHistory || sharedHistory.length === 0) {
    return null; // Don't show card if no shared history
  }

  return (
    <div className="bg-accent/30 rounded-lg p-3 mb-2 border border-accent/50">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Vi siete incontrati
        </span>
      </div>
      
      <div className="space-y-1.5">
        {sharedHistory.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{item.space_title}</span>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {format(new Date(item.booking_date), 'd MMM', { locale: it })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
