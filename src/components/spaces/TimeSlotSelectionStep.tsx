import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Euro, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLogger } from "@/hooks/useLogger";
import { cn } from "@/lib/utils";

interface TimeSlotSelectionStepProps {
  spaceId: string;
  selectedDate: string;
  pricePerDay: number;
  onTimeSlotSelect: (startTime: string, endTime: string) => void;
  isProcessing?: boolean;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  duration: number;
  price: number;
  priceType: 'hourly' | 'daily';
}

export function TimeSlotSelectionStep({ 
  spaceId, 
  selectedDate, 
  pricePerDay, 
  onTimeSlotSelect,
  isProcessing = false 
}: TimeSlotSelectionStepProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { info, error: logError, debug } = useLogger({ context: 'TimeSlotSelectionStep' });

  const generateTimeSlots = useCallback(async (): Promise<TimeSlot[]> => {
    const slots: TimeSlot[] = [];
    const dateObj = new Date(selectedDate);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dateObj.getDay()];

    // Fetch base availability
    const { data: baseAvailability } = await supabase
      .from('availability')
      .select('day_of_week, start_time, end_time')
      .eq('space_id', spaceId)
      .eq('day_of_week', dayOfWeek);

    if (!baseAvailability || baseAvailability.length === 0) {
      return [];
    }

    const dayAvail = baseAvailability[0];
    const availStart = parseInt(dayAvail.start_time.split(':')[0] || '9');
    const availEnd = parseInt(dayAvail.end_time.split(':')[0] || '18');

    // Fetch existing bookings
    const { data: existingBookings } = await supabase.rpc('get_space_availability_optimized', {
      space_id_param: spaceId,
      start_date_param: selectedDate,
      end_date_param: selectedDate
    });

    const conflicts = existingBookings || [];
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    const currentHour = now.getHours();

    // Generate slots (2-8 hour durations)
    for (let startHour = availStart; startHour < availEnd - 1; startHour++) {
      if (isToday && startHour <= currentHour) continue;

      for (let duration = 2; duration <= Math.min(8, availEnd - startHour); duration++) {
        const endHour = startHour + duration;
        const startTime = `${startHour.toString().padStart(2, '0')}:00`;
        const endTime = `${endHour.toString().padStart(2, '0')}:00`;

        // Check conflicts
        const hasConflict = conflicts.some((booking: any) => {
          const bookingStart = parseInt(booking.start_time?.split(':')[0] || '0');
          const bookingEnd = parseInt(booking.end_time?.split(':')[0] || '0');
          return !(endHour <= bookingStart || startHour >= bookingEnd);
        });

        const priceType: 'hourly' | 'daily' = duration >= 8 ? 'daily' : 'hourly';
        const price = priceType === 'daily' ? pricePerDay : Math.round((duration * (pricePerDay / 8)) * 100) / 100;

        slots.push({
          startTime,
          endTime,
          isAvailable: !hasConflict,
          duration,
          price,
          priceType
        });
      }
    }

    return slots.sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.duration - b.duration;
    });
  }, [spaceId, selectedDate, pricePerDay]);

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const slots = await generateTimeSlots();
        setAvailableSlots(slots);
        
        if (slots.filter(s => s.isAvailable).length === 0) {
          setError('Nessun orario disponibile per questa data.');
        }
      } catch (err) {
        logError('Failed to fetch availability', err as Error);
        setError('Errore nel caricamento degli orari.');
        toast.error('Errore nel caricamento degli orari disponibili');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [generateTimeSlots, logError]);

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.isAvailable || isProcessing) {
      toast.error('Questo slot non è disponibile');
      return;
    }
    setSelectedSlot(slot);
  };

  const handleConfirm = () => {
    if (selectedSlot) {
      info('Time slot confirmed', selectedSlot);
      onTimeSlotSelect(selectedSlot.startTime, selectedSlot.endTime);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-gray-600">Caricamento orari disponibili...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <div>
          <h3 className="font-medium text-red-800">Errore nel caricamento</h3>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const availableOnlySlots = availableSlots.filter(slot => slot.isAvailable);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Seleziona l'orario</h3>
        <p className="text-sm text-gray-600">
          {new Date(selectedDate).toLocaleDateString('it-IT', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {availableOnlySlots.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium text-gray-800">Nessun orario disponibile</h3>
          <p className="text-sm text-gray-600">Prova con un'altra data.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
            {availableOnlySlots.map((slot, index) => (
              <Card 
                key={index}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedSlot === slot && "ring-2 ring-primary bg-primary/5"
                )}
                onClick={() => handleSlotSelect(slot)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                        <p className="text-sm text-gray-600">{slot.duration} ore</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">€{slot.price}</p>
                      <Badge variant={slot.priceType === 'daily' ? 'default' : 'secondary'}>
                        {slot.priceType === 'daily' ? 'Giornaliero' : 'Orario'}
                      </Badge>
                    </div>
                  </div>
                  {selectedSlot === slot && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>Slot selezionato</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!selectedSlot || isProcessing}
            className="w-full"
            size="lg"
          >
            <Euro className="w-4 h-4 mr-2" />
            Conferma prenotazione
            {selectedSlot && ` - €${selectedSlot.price}`}
          </Button>
        </>
      )}
    </div>
  );
}