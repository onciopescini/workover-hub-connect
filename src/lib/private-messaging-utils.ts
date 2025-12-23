
import { getOrCreateConversation } from '@/lib/conversations';
import { sreLogger } from '@/lib/sre-logger';

/**
 * Finds or creates a private networking conversation between two users.
 * This is a specialized wrapper around the generic getOrCreateConversation
 * specifically for direct user-to-user messaging without a booking context.
 *
 * @param currentUserId The ID of the user initiating the chat
 * @param targetUserId The ID of the user to chat with
 * @returns The conversation ID
 */
export async function findOrCreatePrivateChat(
  currentUserId: string,
  targetUserId: string
): Promise<string> {
  try {
    sreLogger.info('Initiating private chat', { currentUserId, targetUserId });

    // We strictly pass null for spaceId and bookingId to indicate a private networking chat
    const conversationId = await getOrCreateConversation({
      hostId: targetUserId, // In networking context, "host" is just the target
      coworkerId: currentUserId, // "coworker" is the initiator
      spaceId: null,
      bookingId: null
    });

    return conversationId;
  } catch (error) {
    sreLogger.error('Failed to find or create private chat', { currentUserId, targetUserId }, error as Error);
    throw error;
  }
}
