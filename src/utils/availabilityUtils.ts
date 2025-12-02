
import { AvailabilityData } from '@/types/availability';

const defaultDaySchedule = {
  enabled: true,
  slots: [{ start: '09:00', end: '18:00' }]
};

const defaultClosedDaySchedule = {
  enabled: false,
  slots: []
};

export const defaultAvailability: AvailabilityData = {
  recurring: {
    monday: defaultDaySchedule,
    tuesday: defaultDaySchedule,
    wednesday: defaultDaySchedule,
    thursday: defaultDaySchedule,
    friday: defaultDaySchedule,
    saturday: defaultClosedDaySchedule,
    sunday: defaultClosedDaySchedule
  },
  exceptions: []
};
