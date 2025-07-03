
import { differenceInHours, format } from 'date-fns';
import { Space } from '@/types/space';

export interface BookingDetails {
  date: string;
  timeRange: string;
  duration: number;
  priceBreakdown: string;
  totalCost: number;
  isValid: boolean;
  validationStatus: 'server-validated' | 'client-checked';
}

export const calculateBookingDetails = (
  selectedDate: Date,
  selectedStartTime: string,
  selectedEndTime: string,
  space: Space,
  conflictCheck: { hasConflict: boolean; validated?: boolean },
  isOnline: boolean
): BookingDetails | null => {
  const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedStartTime}:00`);
  const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedEndTime}:00`);
  
  const hours = differenceInHours(endDateTime, startDateTime);
  
  // Enhanced price calculation
  let totalCost = 0;
  let priceBreakdown = '';
  
  if (hours >= 8 && space.price_per_day) {
    totalCost = space.price_per_day;
    priceBreakdown = `Giornata intera (${hours}h)`;
  } else {
    totalCost = hours * space.price_per_hour;
    priceBreakdown = `${hours}h × €${space.price_per_hour}`;
  }

  // Validation status
  const isValid = hours > 0 && 
                 !conflictCheck.hasConflict && 
                 isOnline &&
                 (conflictCheck.validated !== false);

  return {
    date: format(selectedDate, 'dd/MM/yyyy'),
    timeRange: `${selectedStartTime} - ${selectedEndTime}`,
    duration: hours,
    priceBreakdown,
    totalCost,
    isValid,
    validationStatus: conflictCheck.validated ? 'server-validated' : 'client-checked'
  };
};

// Helper function for CSS classes
export const cn = (...classes: (string | undefined | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};
