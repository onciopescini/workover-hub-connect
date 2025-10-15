import React from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format, parse, isWithinInterval, parseISO } from "date-fns";
import { 
  fetchOptimizedSpaceAvailability, 
  validateBookingSlotWithLock as rpcValidateBookingSlot,
  ValidationResult
} from './availability-rpc';
import { sreLogger } from '@/lib/sre-logger';
import { TIME_CONSTANTS } from '@/constants';

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

// SCALABILITY FIX: Use sessionStorage instead of in-memory Map for horizontal scaling
const CACHE_DURATION = TIME_CONSTANTS.CACHE_DURATION;

const getClientCache = (key: string) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(`avail_${key}`);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(`avail_${key}`);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

const setClientCache = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(`avail_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    sreLogger.warn('Failed to cache availability', {
      component: 'availability-utils',
      action: 'cache_write',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

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
  allBookings: Array<{ booking_date: string; start_time: string; end_time: string; status: string; id?: string }>
): boolean => {
  return !allBookings.some(booking => {
    if (booking.booking_date !== date) return false;
    
    // Controlla sovrapposizioni con TUTTE le prenotazioni confermate
    return (startTime < booking.end_time && endTime > booking.start_time) && 
           ['confirmed', 'pending'].includes(booking.status);
  });
};

// Enhanced fetchSpaceBookings con RPC optimization
export const fetchSpaceBookings = async (
  spaceId: string, 
  startDate: string, 
  endDate: string,
  useCache: boolean = true,
  useRPC: boolean = true
) => {
  const cacheKey = `${spaceId}-${startDate}-${endDate}`;
  
  // Check sessionStorage cache
  if (useCache) {
    const cached = getClientCache(cacheKey);
    if (cached) return cached;
  }

  try {
    let bookings;
    
    // Prova prima con RPC ottimizzato
    if (useRPC) {
      try {
        bookings = await fetchOptimizedSpaceAvailability(spaceId, startDate, endDate);
      } catch (rpcError) {
        sreLogger.warn('RPC fallback to standard query', {
          component: 'availability-utils',
          action: 'fetch_bookings',
          spaceId,
          error: rpcError instanceof Error ? rpcError.message : String(rpcError)
        });
        useRPC = false;
      }
    }
    
    // Fallback a query standard se RPC non disponibile
    if (!useRPC) {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, status, user_id')
        .eq('space_id', spaceId)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;
      bookings = data || [];
    }
    
    // Update sessionStorage cache
    if (useCache) {
      setClientCache(cacheKey, bookings);
    }
    
    return bookings;
  } catch (error) {
    sreLogger.error('Error fetching space bookings', {
      component: 'availability-utils',
      action: 'fetch_bookings',
      spaceId,
      startDate,
      endDate
    }, error instanceof Error ? error : new Error(String(error)));
    return [];
  }
};

// Invalida cache per real-time updates
export const invalidateAvailabilityCache = (spaceId: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`avail_${spaceId}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => sessionStorage.removeItem(key));
  } catch (error) {
    sreLogger.warn('Failed to invalidate cache', {
      component: 'availability-utils',
      action: 'cache_invalidate',
      spaceId
    });
  }
};

// Calcola la disponibilità per una data specifica (ottimizzato)
export const calculateDayAvailability = (
  date: string,
  spaceAvailability: { recurring?: Record<string, { enabled: boolean }> } | null,
  allBookings: Array<{ booking_date: string; start_time: string; end_time: string; status: string; id?: string }>
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
    
    if (!startTime || !endTime) continue;
    const isAvailable = isSlotAvailable(date, startTime, endTime, allBookings);
    
    const slot: TimeSlot = {
      start: startTime ?? '',
      end: endTime ?? '',
      available: isAvailable
    };

    if (!isAvailable) {
      const conflictingBooking = allBookings.find(b => 
        b.booking_date === date && 
        (startTime ?? '') < (b.end_time ?? '') && 
        (endTime ?? '') > (b.start_time ?? '') &&
        ['confirmed', 'pending'].includes(b.status)
      );
      if (conflictingBooking?.id) {
        slot.bookingId = conflictingBooking.id;
      }
    }

    availableSlots.push(slot);
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
  const [error, setError] = React.useState<string | null>(null);

  const fetchAvailability = React.useCallback(async (forceRefresh = false) => {
    if (!spaceId) return;

    setLoading(true);
    setError(null);
    
    const startDate = format(selectedMonth, 'yyyy-MM-01');
    const endDate = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0), 'yyyy-MM-dd');
    
    try {
      // Recupera le prenotazioni esistenti con RPC ottimizzato
      const bookings = await fetchSpaceBookings(spaceId, startDate, endDate, !forceRefresh, true) as Array<{ booking_date: string; start_time: string; end_time: string; status: string; id?: string }>;
      
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
        availabilityMap[date] = calculateDayAvailability(
          date, 
          spaceData?.availability as { recurring?: Record<string, { enabled: boolean }> } | null, 
          bookings
        );
      }
      
      setAvailability(availabilityMap);
    } catch (error) {
      sreLogger.error('Error fetching availability', {
        component: 'useSpaceAvailability',
        action: 'fetch_availability',
        spaceId,
        startDate,
        endDate
      }, error instanceof Error ? error : new Error(String(error)));
      setError('Errore nel caricamento della disponibilità');
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
          sreLogger.info('Real-time booking update received', {
            component: 'useSpaceAvailability',
            action: 'realtime_update',
            spaceId,
            eventType: payload.eventType
          });
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
    error,
    refreshAvailability: () => fetchAvailability(true)
  };
};

// Enhanced checkRealTimeConflicts with server-side validation
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
      .select('id, booking_date, start_time, end_time, status')
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
    sreLogger.error('Error checking real-time conflicts', {
      component: 'availability-utils',
      action: 'check_conflicts',
      spaceId,
      date,
      startTime,
      endTime
    }, error instanceof Error ? error : new Error(String(error)));
    return { hasConflict: false, conflictingBookings: [] };
  }
};

// New enhanced validation with server-side lock
export const validateBookingSlotWithLock = async (
  spaceId: string,
  date: string,
  startTime: string,
  endTime: string,
  userId: string
): Promise<ValidationResult> => {
  try {
    const result = await rpcValidateBookingSlot(spaceId, date, startTime, endTime, userId);
    return result;
  } catch (error) {
    sreLogger.warn('Server validation failed, using client-side fallback', {
      component: 'availability-utils',
      action: 'validate_booking_slot',
      spaceId,
      date,
      startTime,
      endTime
    });
    // Fallback to client-side validation
    const { hasConflict, conflictingBookings } = await checkRealTimeConflicts(
      spaceId, date, startTime, endTime
    );
    
    return {
      valid: !hasConflict,
      conflicts: conflictingBookings,
      message: hasConflict ? 'Client-side conflict detected' : 'Available (client-side check)'
    };
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
      .select('id, space_id, booking_date, start_time, end_time, status')
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
      const spaceId = booking?.space_id;
      if (spaceId && groupedBookings[spaceId]) {
        groupedBookings[spaceId].push(booking);
      }
    });

    return groupedBookings;
  } catch (error) {
    sreLogger.error('Error fetching multiple spaces availability', {
      component: 'availability-utils',
      action: 'fetch_multiple_spaces',
      spaceIds,
      startDate,
      endDate
    }, error instanceof Error ? error : new Error(String(error)));
    return {};
  }
};
