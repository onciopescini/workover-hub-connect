
export interface TimeSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface AvailabilityException {
  date: string;
  enabled: boolean; // Changed from 'available' to 'enabled' for consistency
  slots?: TimeSlot[];
}

export interface AvailabilityData {
  recurring: WeeklySchedule;
  exceptions: AvailabilityException[];
}
