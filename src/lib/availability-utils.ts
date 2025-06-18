
import React from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format, parse, isWithinInterval, parseISO } from "date-fns";

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  bookingId?: string;
}

export interface DayAvailability {
  date: string;
  status: 'available' | 'partial' | 'unavailable' | 'disabled';
  availableSlots: TimeSlot[];
}

// Cache per ottimizzare le performance
const availabilityCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

// Genera slot di tempo in intervalli di 30 minuti
export const generateTimeSlots = (startHour: number = 9, endHour: number = 18): string[] => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  slots.push(`${endHour.toString().padStart(2, '0')}:00`);
  return slots;
};

// Controlla se un time slot è disponibile considerando TUTTE le prenotazioni
export const isSlotAvailable = (
  date: string, 
  startTime: string, 
  endTime: string, 
  allBookings: any[]
): boolean => {
  return !allBookings.some(booking => {
    if (booking.booking_date !== date) return false;
    
    // Controlla sovrapposizioni con TUTTE le prenotazioni confermate
    return (startTime < booking.end_time && endTime > booking.start_time) && 
           ['confirmed', 'pending'].includes(booking.status);
  });
};

// Recupera tutte le prenotazioni per uno spazio (con cache)
export const fetchSpaceBookings = async (
  spaceId: string, 
  startDate: string, 
  endDate: string,
  useCache: boolean = true
) => {
  const cacheKey = `${spaceId}-${startDate}-${endDate}`;
  
  // Controlla cache
  if (useCache && availabilityCache.has(cacheKey)) {
    const cached = availabilityCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('space_id', spaceId)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .in('status', ['pending', 'confirmed']);

    if (error) throw error;
    
    const bookings = data || [];
    
    // Aggiorna cache
    if (useCache) {
      availabilityCache.set(cacheKey, {
        data: bookings,
        timestamp: Date.now()
      });
    }
    
    return bookings;
  } catch (error) {
    console.error('Error fetching space bookings:', error);
    return [];
  }
};

// Invalida cache per real-time updates
export const invalidateAvailabilityCache = (spaceId: string) => {
  for (const key of availabilityCache.keys()) {
    if (key.startsWith(spaceId)) {
      availabilityCache.delete(key);
    }
  }
};

// Calcola la disponibilità per una data specifica (ottimizzato)
export const calculateDayAvailability = (
  date: string,
  spaceAvailability: any,
  allBookings: any[]
): DayAvailability => {
  const dayOfWeek = format(parseISO(date), 'EEEE').toLowerCase();
  const daySchedule = spaceAvailability?.recurring?.[dayOfWeek];
  
  // Se il giorno non è abilitato dall'host
  if (!daySchedule?.enabled) {
    return {
      date,
      status: 'disabled',
      availableSlots: []
    };
  }

  // Genera tutti i possibili slot per il giorno
  const allSlots = generateTimeSlots();
  const availableSlots: TimeSlot[] = [];
  
  for (let i = 0; i < allSlots.length - 1; i++) {
    const startTime = allSlots[i];
    const endTime = allSlots[i + 1];
    
    const isAvailable = isSlotAvailable(date, startTime, endTime, allBookings);
    
    availableSlots.push({
      start: startTime,
      end: endTime,
      available: isAvailable,
      bookingId: isAvailable ? undefined : allBookings.find(b => 
        b.booking_date === date && 
        startTime < b.end_time && 
        endTime > b.start_time &&
        ['confirmed', 'pending'].includes(b.status)
      )?.id
    });
  }

  // Determina lo status del giorno
  const totalSlots = availableSlots.length;
  const unavailableSlots = availableSlots.filter(slot => !slot.available).length;
  
  let status: DayAvailability['status'];
  if (unavailableSlots === 0) {
    status = 'available';
  } else if (unavailableSlots === totalSlots) {
    status = 'unavailable';
  } else {
    status = 'partial';
  }

  return {
    date,
    status,
    availableSlots
  };
};

// Hook ottimizzato per gestire la disponibilità con real-time updates
export const useSpaceAvailability = (spaceId: string, selectedMonth: Date) => {
  const [availability, setAvailability] = React.useState<Record<string, DayAvailability>>({});
  const [loading, setLoading] = React.useState(false);

  const fetchAvailability = React.useCallback(async (forceRefresh = false) => {
    if (!spaceId) return;

    setLoading(true);
    
    const startDate = format(selectedMonth, 'yyyy-MM-01');
    const endDate = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0), 'yyyy-MM-dd');
    
    try {
      // Recupera le prenotazioni esistenti con cache
      const bookings = await fetchSpaceBookings(spaceId, startDate, endDate, !forceRefresh);
      
      // Recupera la configurazione di disponibilità dello spazio
      const { data: spaceData } = await supabase
        .from('spaces')
        .select('availability')
        .eq('id', spaceId)
        .single();

      // Calcola la disponibilità per ogni giorno del mese
      const availabilityMap: Record<string, DayAvailability> = {};
      
      for (let day = 1; day <= new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate(); day++) {
        const date = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day), 'yyyy-MM-dd');
        availabilityMap[date] = calculateDayAvailability(date, spaceData?.availability, bookings);
      }
      
      setAvailability(availabilityMap);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  }, [spaceId, selectedMonth]);

  // Setup real-time subscription per questo spazio
  React.useEffect(() => {
    if (!spaceId) return;

    const channel = supabase
      .channel(`space-${spaceId}-bookings`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `space_id=eq.${spaceId}`
        },
        (payload) => {
          console.log('Real-time booking update:', payload);
          // Invalida cache e ricarica
          invalidateAvailabilityCache(spaceId);
          fetchAvailability(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, fetchAvailability]);

  // Fetch iniziale
  React.useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return { 
    availability, 
    loading, 
    refreshAvailability: () => fetchAvailability(true)
  };
};

// Utility per verificare conflitti real-time prima del checkout
export const checkRealTimeConflicts = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBookings: any[] }> => {
  try {
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('space_id', spaceId)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed'])
      .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      hasConflict: (data || []).length > 0,
      conflictingBookings: data || []
    };
  } catch (error) {
    console.error('Error checking real-time conflicts:', error);
    return { hasConflict: false, conflictingBookings: [] };
  }
};

// Utility per ottimizzare le query di disponibilità batch
export const fetchMultipleSpacesAvailability = async (
  spaceIds: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, any[]>> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .in('space_id', spaceIds)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .in('status', ['pending', 'confirmed']);

    if (error) throw error;

    // Raggruppa per spaceId
    const groupedBookings: Record<string, any[]> = {};
    spaceIds.forEach(id => {
      groupedBookings[id] = [];
    });

    (data || []).forEach(booking => {
      if (groupedBookings[booking.space_id]) {
        groupedBookings[booking.space_id].push(booking);
      }
    });

    return groupedBookings;
  } catch (error) {
    console.error('Error fetching multiple spaces availability:', error);
    return {};
  }
};
