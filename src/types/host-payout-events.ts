export type HostPayoutEventStatus = 'scheduled' | 'completed';

export interface HostPayoutEvent {
  id: string;
  bookingId: string;
  spaceId: string;
  spaceTitle: string;
  status: HostPayoutEventStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  payoutTransferId: string | null;
  eventDate: string;
}
