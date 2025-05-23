
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
    profile_photo_url?: string;
    bio?: string;
  };
  receiver?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
    bio?: string;
  };
}

export interface ConnectionSuggestion {
  id: string;
  user_id: string;
  suggested_user_id: string;
  reason: 'shared_space' | 'shared_event' | 'similar_interests';
  shared_context: Record<string, any>;
  score: number;
  created_at: string;
  suggested_user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
    bio?: string;
  };
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
