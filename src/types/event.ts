
export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  space_id: string;
  created_by: string | null;
  created_at: string | null;
  max_participants: number | null;
  current_participants: number | null;
  image_url: string | null;
  status: string | null;
}

export interface EventWithDetails extends Event {
  space?: {
    id: string;
    title: string;
    address: string;
  };
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
  participants?: EventParticipant[];
  waitlist?: WaitlistEntry[];
}

export interface EventParticipant {
  event_id: string;
  user_id: string;
  joined_at: string | null;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

export interface WaitlistEntry {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string | null;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}
