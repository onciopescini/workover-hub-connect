
export interface ConversationItem {
  id: string;
  type: 'booking' | 'private' | 'group';
  title: string;
  subtitle: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  status?: 'confirmed' | 'pending' | 'cancelled' | 'active';
  priority?: 'urgent' | 'high' | 'normal';
  businessContext?: {
    type: 'booking' | 'payment' | 'general';
    details?: string;
  };
}
