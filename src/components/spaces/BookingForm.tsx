
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";

interface BookingFormProps {
  spaceId: string;
  pricePerDay: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function BookingForm({ spaceId, pricePerDay, onSuccess, onError }: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !startTime || !endTime) {
      onError('Tutti i campi sono obbligatori');
      return;
    }

    if (startTime >= endTime) {
      onError('L\'orario di fine deve essere successivo a quello di inizio');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate booking creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Prenotazione creata con successo!');
      onSuccess();
    } catch (error) {
      console.error('Error creating booking:', error);
      onError('Errore nella creazione della prenotazione');
    } finally {
      setIsLoading(false);
    }
  };

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

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
  };

  const totalPrice = calculateDuration() * (pricePerDay / 8); // Assuming 8-hour workday

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Prenota questo spazio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Orario inizio</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona orario" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Orario fine</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona orario" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {startTime && endTime && startTime < endTime && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Durata:</span>
                <span className="font-medium">{calculateDuration()} ore</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Prezzo totale:</span>
                <span className="font-bold text-lg">€{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !selectedDate || !startTime || !endTime}
          >
            {isLoading ? 'Prenotando...' : 'Prenota ora'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
