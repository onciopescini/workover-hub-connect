
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

// Controlla se un time slot è disponibile
export const isSlotAvailable = (
  date: string, 
  startTime: string, 
  endTime: string, 
  existingBookings: any[]
): boolean => {
  return !existingBookings.some(booking => {
    if (booking.booking_date !== date) return false;
    
    // Controlla sovrapposizioni
    return (startTime < booking.end_time && endTime > booking.start_time);
  });
};

// Recupera tutte le prenotazioni per uno spazio in un range di date
export const fetchSpaceBookings = async (
  spaceId: string, 
  startDate: string, 
  endDate: string
) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('space_id', spaceId)
      .gte('booking_date', startDate)
      .lte('booking_date', endDate)
      .in('status', ['pending', 'confirmed']);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching space bookings:', error);
    return [];
  }
};

// Calcola la disponibilità per una data specifica
export const calculateDayAvailability = (
  date: string,
  spaceAvailability: any,
  existingBookings: any[]
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
    
    const isAvailable = isSlotAvailable(date, startTime, endTime, existingBookings);
    
    availableSlots.push({
      start: startTime,
      end: endTime,
      available: isAvailable,
      bookingId: isAvailable ? undefined : existingBookings.find(b => 
        b.booking_date === date && 
        startTime < b.end_time && 
        endTime > b.start_time
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

// Hook per gestire la disponibilità in tempo reale
export const useSpaceAvailability = (spaceId: string, selectedMonth: Date) => {
  const [availability, setAvailability] = React.useState<Record<string, DayAvailability>>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!spaceId) return;

    const fetchAvailability = async () => {
      setLoading(true);
      
      const startDate = format(selectedMonth, 'yyyy-MM-01');
      const endDate = format(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0), 'yyyy-MM-dd');
      
      try {
        // Recupera le prenotazioni esistenti
        const bookings = await fetchSpaceBookings(spaceId, startDate, endDate);
        
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
    };

    fetchAvailability();
  }, [spaceId, selectedMonth]);

  return { availability, loading };
};
