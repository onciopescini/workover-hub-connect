export interface BookingTimeSlot {
  time: string;
  available: boolean;
  reserved?: boolean;
  selected?: boolean;
}
