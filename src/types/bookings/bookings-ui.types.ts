export interface PartyInfo {
  id: string;
  name: string;
  photo: string | null;
  role: string;
}

export interface BookingCardDisplayData {
  otherParty: PartyInfo;
  formattedDate: string;
  canCancel: boolean;
  showReviewButton: boolean;
}

export type UserRole = "host" | "coworker";