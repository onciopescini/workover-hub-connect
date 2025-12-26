
export interface Connection {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  expires_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string | null;
    bio?: string | null;
  };
  receiver?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string | null;
    bio?: string | null;
  };
}

export interface ConnectionSuggestion {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  workspace_name: string;
  booking_date: string;
}

export interface PrivateChat {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  created_at: string;
  last_message_at: string;
  participant_1?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  participant_2?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export interface PrivateMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  attachments: string[];
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export interface Coworker {
  id: string;
  first_name: string;
  last_name: string;
  profession: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  cached_avg_rating?: number;
  cached_review_count?: number;
}
