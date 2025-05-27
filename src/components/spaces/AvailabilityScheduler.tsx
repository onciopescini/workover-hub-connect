
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, Copy } from "lucide-react";
import { type AvailabilityData, type TimeSlot, type WeeklySchedule } from "@/types/availability";

interface AvailabilitySchedulerProps {
  availability: AvailabilityData;
  onAvailabilityChange: (availability: AvailabilityData) => void;
  isSubmitting: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunedì' },
  { key: 'tuesday', label: 'Martedì' },
  { key: 'wednesday', label: 'Mercoledì' },
  { key: 'thursday', label: 'Giovedì' },
  { key: 'friday', label: 'Venerdì' },
  { key: 'saturday', label: 'Sabato' },
  { key: 'sunday', label: 'Domenica' }
];

export const AvailabilityScheduler = ({
  availability,
  onAvailabilityChange,
  isSubmitting
}: AvailabilitySchedulerProps) => {
  const [copyFromDay, setCopyFromDay] = useState<string>('');

  const updateDayEnabled = (day: string, enabled: boolean) => {
    const newAvailability = {
      ...availability,
      recurring: {
        ...availability.recurring,
        [day]: {
          ...availability.recurring[day as keyof WeeklySchedule],
          enabled,
          slots: enabled ? availability.recurring[day as keyof WeeklySchedule]?.slots || [{ start: '09:00', end: '17:00' }] : []
        }
      }
    };
    onAvailabilityChange(newAvailability);
  };

  const updateTimeSlot = (day: string, slotIndex: number, field: 'start' | 'end', value: string) => {
    const daySchedule = availability.recurring[day as keyof WeeklySchedule];
    const newSlots = [...(daySchedule?.slots || [])];
    newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
    
    const newAvailability = {
      ...availability,
      recurring: {
        ...availability.recurring,
        [day]: {
          ...daySchedule,
          slots: newSlots
        }
      }
    };
    onAvailabilityChange(newAvailability);
  };

  const addTimeSlot = (day: string) => {
    const daySchedule = availability.recurring[day as keyof WeeklySchedule];
    const existingSlots = daySchedule?.slots || [];
    const newSlot = { start: '09:00', end: '17:00' };
    
    const newAvailability = {
      ...availability,
      recurring: {
        ...availability.recurring,
        [day]: {
          ...daySchedule,
          enabled: true,
          slots: [...existingSlots, newSlot]
        }
      }
    };
    onAvailabilityChange(newAvailability);
  };

  const removeTimeSlot = (day: string, slotIndex: number) => {
    const daySchedule = availability.recurring[day as keyof WeeklySchedule];
    const newSlots = daySchedule?.slots.filter((_, index) => index !== slotIndex) || [];
    
    const newAvailability = {
      ...availability,
      recurring: {
        ...availability.recurring,
        [day]: {
          ...daySchedule,
          slots: newSlots
        }
      }
    };
    onAvailabilityChange(newAvailability);
  };

  const copyScheduleFromDay = (fromDay: string, toDay: string) => {
    const fromDaySchedule = availability.recurring[fromDay as keyof WeeklySchedule];
    if (!fromDaySchedule) return;
    
    const newAvailability = {
      ...availability,
      recurring: {
        ...availability.recurring,
        [toDay]: {
          enabled: fromDaySchedule.enabled,
          slots: [...fromDaySchedule.slots]
        }
      }
    };
    onAvailabilityChange(newAvailability);
  };

  const applyToAllDays = () => {
    if (!copyFromDay) return;
    
    const templateSchedule = availability.recurring[copyFromDay as keyof WeeklySchedule];
    if (!templateSchedule) return;
    
    const newRecurring: WeeklySchedule = {} as WeeklySchedule;
    
    DAYS_OF_WEEK.forEach(({ key }) => {
      newRecurring[key as keyof WeeklySchedule] = {
        enabled: templateSchedule.enabled,
        slots: [...templateSchedule.slots]
      };
    });
    
    const newAvailability = {
      ...availability,
      recurring: newRecurring
    };
    onAvailabilityChange(newAvailability);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Disponibilità
        </CardTitle>
        <p className="text-sm text-gray-500">
          Imposta gli orari in cui lo spazio è disponibile per le prenotazioni
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Actions */}
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Label htmlFor="copy-from">Copia orari da:</Label>
            <select
              id="copy-from"
              value={copyFromDay}
              onChange={(e) => setCopyFromDay(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
              disabled={isSubmitting}
            >
              <option value="">Seleziona giorno</option>
              {DAYS_OF_WEEK.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyToAllDays}
            disabled={!copyFromDay || isSubmitting}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Applica a tutti i giorni
          </Button>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-4">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const daySchedule = availability.recurring[key as keyof WeeklySchedule] || { enabled: false, slots: [] };
            
            return (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={daySchedule.enabled}
                      onCheckedChange={(enabled) => updateDayEnabled(key, enabled)}
                      disabled={isSubmitting}
                    />
                    <Label className="font-medium">{label}</Label>
                  </div>
                  {daySchedule.enabled && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeSlot(key)}
                        disabled={isSubmitting}
                      >
                        Aggiungi orario
                      </Button>
                      {copyFromDay && copyFromDay !== key && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyScheduleFromDay(copyFromDay, key)}
                          disabled={isSubmitting}
                        >
                          Copia da {DAYS_OF_WEEK.find(d => d.key === copyFromDay)?.label}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {daySchedule.enabled && (
                  <div className="space-y-2">
                    {daySchedule.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Dalle</Label>
                          <Input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(key, slotIndex, 'start', e.target.value)}
                            className="w-32"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">alle</Label>
                          <Input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(key, slotIndex, 'end', e.target.value)}
                            className="w-32"
                            disabled={isSubmitting}
                          />
                        </div>
                        {daySchedule.slots.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(key, slotIndex)}
                            disabled={isSubmitting}
                            className="text-red-500 hover:text-red-700"
                          >
                            Rimuovi
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {daySchedule.slots.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        Nessun orario impostato per questo giorno
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Suggerimento:</strong> Puoi impostare più fasce orarie per lo stesso giorno 
            (es. 9:00-12:00 e 14:00-17:00) e copiare gli orari da un giorno all'altro per risparmiare tempo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
