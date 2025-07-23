import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Clock, Plus, Trash2 } from 'lucide-react';
import type { AvailabilityData, DaySchedule, TimeSlot } from '@/types/availability';

interface AvailabilityEditorProps {
  availabilityData: AvailabilityData;
  onAvailabilityChange: (availability: AvailabilityData) => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunedì' },
  { key: 'tuesday', label: 'Martedì' },
  { key: 'wednesday', label: 'Mercoledì' },
  { key: 'thursday', label: 'Giovedì' },
  { key: 'friday', label: 'Venerdì' },
  { key: 'saturday', label: 'Sabato' },
  { key: 'sunday', label: 'Domenica' }
] as const;

export const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
  availabilityData,
  onAvailabilityChange
}) => {
  const addTimeSlot = (dayKey: keyof AvailabilityData['recurring']) => {
    const newSlot: TimeSlot = {
      start: '09:00',
      end: '17:00'
    };
    
    const updatedData = {
      ...availabilityData,
      recurring: {
        ...availabilityData.recurring,
        [dayKey]: {
          ...availabilityData.recurring[dayKey],
          enabled: true,
          slots: [...(availabilityData.recurring[dayKey]?.slots || []), newSlot]
        }
      }
    };
    
    onAvailabilityChange(updatedData);
  };

  const removeTimeSlot = (dayKey: keyof AvailabilityData['recurring'], slotIndex: number) => {
    const daySchedule = availabilityData.recurring[dayKey];
    if (!daySchedule) return;

    const updatedSlots = daySchedule.slots.filter((_, index) => index !== slotIndex);
    
    const updatedData = {
      ...availabilityData,
      recurring: {
        ...availabilityData.recurring,
        [dayKey]: {
          ...daySchedule,
          slots: updatedSlots,
          enabled: updatedSlots.length > 0
        }
      }
    };
    
    onAvailabilityChange(updatedData);
  };

  const updateTimeSlot = (
    dayKey: keyof AvailabilityData['recurring'], 
    slotIndex: number, 
    field: 'start' | 'end', 
    value: string
  ) => {
    const daySchedule = availabilityData.recurring[dayKey];
    if (!daySchedule) return;

    const updatedSlots = daySchedule.slots.map((slot, index) => 
      index === slotIndex ? { ...slot, [field]: value } : slot
    );
    
    const updatedData = {
      ...availabilityData,
      recurring: {
        ...availabilityData.recurring,
        [dayKey]: {
          ...daySchedule,
          slots: updatedSlots
        }
      }
    };
    
    onAvailabilityChange(updatedData);
  };

  const toggleDayAvailability = (dayKey: keyof AvailabilityData['recurring']) => {
    const daySchedule = availabilityData.recurring[dayKey];
    const isCurrentlyAvailable = daySchedule?.enabled || false;
    
    const updatedData = {
      ...availabilityData,
      recurring: {
        ...availabilityData.recurring,
        [dayKey]: {
          enabled: !isCurrentlyAvailable,
          slots: !isCurrentlyAvailable && (!daySchedule?.slots || daySchedule.slots.length === 0) 
            ? [{ start: '09:00', end: '17:00' }] 
            : daySchedule?.slots || []
        }
      }
    };
    
    onAvailabilityChange(updatedData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Configurazione Disponibilità
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {DAYS_OF_WEEK.map(({ key, label }) => {
          const daySchedule = availabilityData.recurring[key as keyof AvailabilityData['recurring']];
          const isAvailable = daySchedule?.enabled || false;
          const slots = daySchedule?.slots || [];

          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`available-${key}`}
                    checked={isAvailable}
                    onCheckedChange={() => toggleDayAvailability(key as keyof AvailabilityData['recurring'])}
                  />
                  <Label htmlFor={`available-${key}`} className="font-medium">
                    {label}
                  </Label>
                </div>
                {isAvailable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(key as keyof AvailabilityData['recurring'])}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi Fascia
                  </Button>
                )}
              </div>

              {isAvailable && slots.length > 0 && (
                <div className="ml-6 space-y-2">
                  {slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground min-w-[30px]">
                        Da:
                      </Label>
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(
                          key as keyof AvailabilityData['recurring'], 
                          slotIndex, 
                          'start', 
                          e.target.value
                        )}
                        className="w-32"
                      />
                      <Label className="text-sm text-muted-foreground">
                        A:
                      </Label>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(
                          key as keyof AvailabilityData['recurring'], 
                          slotIndex, 
                          'end', 
                          e.target.value
                        )}
                        className="w-32"
                      />
                      {slots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(
                            key as keyof AvailabilityData['recurring'], 
                            slotIndex
                          )}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {key !== 'sunday' && <Separator className="mt-4" />}
            </div>
          );
        })}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Suggerimento:</strong> Configura i tuoi orari di disponibilità per ogni giorno della settimana. 
            Puoi aggiungere più fasce orarie per lo stesso giorno se necessario.
          </p>
        </div>

        {/* TODO: Add exception dates functionality */}
        {/* TODO: Add bulk operations (copy day, apply to all weekdays, etc.) */}
        {/* TODO: Add validation for overlapping time slots */}
        {/* TODO: Add timezone support */}
      </CardContent>
    </Card>
  );
};