import React from 'react';
import { GeographicSearch } from '@/components/shared/GeographicSearchRefactored';
import { DateRangePicker } from './DateRangePicker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal, MapPin, Star, Clock } from 'lucide-react';
import { Coordinates } from '@/types/space-filters';

interface CompactSearchBarProps {
  location: string;
  startDate: Date | null;
  endDate: Date | null;
  activeFiltersCount: number;
  isFiltersOpen: boolean;
  onLocationChange: (location: string, coordinates?: Coordinates) => void;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onToggleFilters: () => void;
  onNearMe: () => void;
  onTopRated: () => void;
  onAvailableNow: () => void;
}

export const CompactSearchBar: React.FC<CompactSearchBarProps> = ({
  location,
  startDate,
  endDate,
  activeFiltersCount,
  isFiltersOpen,
  onLocationChange,
  onStartDateChange,
  onEndDateChange,
  onToggleFilters,
  onNearMe,
  onTopRated,
  onAvailableNow
}) => {
  return (
    <div className="sticky top-0 z-30 bg-background border-b shadow-sm">
      <div className="px-4 py-3">
        {/* Main Search Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Location Search */}
          <div className="flex-1 min-w-[200px]">
            <GeographicSearch
              value={location}
              onChange={onLocationChange}
              placeholder="📍 Cerca per luogo..."
              className="w-full"
            />
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            className="hidden md:flex"
          />

          {/* Advanced Filters Button */}
          <Button
            variant={isFiltersOpen ? "default" : "outline"}
            onClick={onToggleFilters}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtri
            {activeFiltersCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-2 px-1.5 py-0 text-xs min-w-[20px] h-5"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {/* Quick Actions - Desktop */}
          <div className="hidden lg:flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNearMe}
              className="text-xs"
            >
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              Vicino a me
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTopRated}
              className="text-xs"
            >
              <Star className="h-3.5 w-3.5 mr-1.5" />
              Top rated
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAvailableNow}
              className="text-xs"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Disponibile ora
            </Button>
          </div>
        </div>

        {/* Mobile Date Picker Row */}
        <div className="mt-3 md:hidden">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            className="w-full justify-center"
          />
        </div>
      </div>
    </div>
  );
};
