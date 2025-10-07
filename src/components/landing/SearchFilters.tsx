import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GeographicSearch } from '@/components/shared/GeographicSearchRefactored';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Coordinates } from '@/types/space-filters';

export const SearchFilters: React.FC = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);

  const handleLocationChange = (newLocation: string, coords?: Coordinates) => {
    setLocation(newLocation);
    if (coords) {
      setCoordinates(coords);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (location) {
      params.append('city', location);
    }
    if (coordinates) {
      params.append('lat', coordinates.lat.toString());
      params.append('lng', coordinates.lng.toString());
    }
    if (date) {
      params.append('date', format(date, 'yyyy-MM-dd'));
    }
    if (startTime) {
      params.append('startTime', startTime);
    }
    if (endTime) {
      params.append('endTime', endTime);
    }

    navigate(`/spaces?${params.toString()}`);
  };

  const isSearchEnabled = location || date || startTime || endTime;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* Location Search */}
      <div className="w-full">
        <GeographicSearch
          value={location}
          onChange={handleLocationChange}
          placeholder="🌍 Dove vuoi lavorare oggi?"
          className="w-full h-14 text-lg"
        />
      </div>

      {/* Date and Time Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal h-12",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'dd MMMM yyyy', { locale: it }) : 'Seleziona data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={date || undefined}
              onSelect={(newDate) => setDate(newDate || null)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Start Time Picker */}
        <TimePicker
          value={startTime}
          onChange={setStartTime}
          placeholder="Orario inizio"
          className="h-12"
          disabled={!date}
        />

        {/* End Time Picker */}
        <TimePicker
          value={endTime}
          onChange={setEndTime}
          placeholder="Orario fine"
          className="h-12"
          minTime={startTime || undefined}
          disabled={!date || !startTime}
        />
      </div>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={!isSearchEnabled}
        size="lg"
        className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white shadow-2xl hover-scale-gpu transition-all duration-300"
      >
        🔍 Cerca Spazi Disponibili
      </Button>
    </div>
  );
};