import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Trash2, Clock } from "lucide-react";
import { BookingSlot } from "@/types/booking";

interface BookingSlotItemProps {
  slot: BookingSlot;
  onUpdate: (updatedSlot: BookingSlot) => void;
  onRemove: () => void;
  canRemove: boolean;
  isProcessing?: boolean;
}

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 9; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(timeString);
    }
  }
  return options;
};

export const BookingSlotItem: React.FC<BookingSlotItemProps> = ({
  slot,
  onUpdate,
  onRemove,
  canRemove,
  isProcessing = false
}) => {
  const timeOptions = generateTimeOptions();

  const handleDateChange = (date: string) => {
    onUpdate({ ...slot, date });
  };

  const handleStartTimeChange = (startTime: string) => {
    onUpdate({ ...slot, startTime });
  };

  const handleEndTimeChange = (endTime: string) => {
    onUpdate({ ...slot, endTime });
  };

  const calculateDuration = () => {
    if (!slot.startTime || !slot.endTime) return 0;
    const start = new Date(`2000-01-01T${slot.startTime}`);
    const end = new Date(`2000-01-01T${slot.endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
  };

  const duration = calculateDuration();
  const isValidSlot = slot.date && slot.startTime && slot.endTime && slot.startTime < slot.endTime;

  return (
    <Card className={`${slot.hasConflict ? 'border-red-300 bg-red-50' : ''}`}>
      <CardContent className="p-4 space-y-4">
        {/* Header with remove button */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Slot di prenotazione</h4>
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isProcessing}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Date selection */}
        <div className="space-y-2">
          <Label htmlFor={`date-${slot.id}`}>Data</Label>
          <Input
            id={`date-${slot.id}`}
            type="date"
            value={slot.date}
            onChange={(e) => handleDateChange(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            disabled={isProcessing}
          />
        </div>

        {/* Time selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`start-${slot.id}`}>Orario inizio</Label>
            <Select 
              value={slot.startTime} 
              onValueChange={handleStartTimeChange} 
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona orario" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`end-${slot.id}`}>Orario fine</Label>
            <Select 
              value={slot.endTime} 
              onValueChange={handleEndTimeChange} 
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona orario" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Duration display */}
        {isValidSlot && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <Clock className="w-4 h-4" />
            <span>Durata: {duration} ore</span>
          </div>
        )}

        {/* Conflict warning */}
        {slot.hasConflict && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Conflitto rilevato
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {slot.conflictMessage}
                </p>
                {slot.suggestions && slot.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600 font-medium">Suggerimenti:</p>
                    <ul className="text-xs text-red-600 mt-1">
                      {slot.suggestions.map((suggestion, index) => (
                        <li key={index}>• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};