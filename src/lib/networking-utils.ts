import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TIME_CONSTANTS } from '@/constants';
import { getOrCreateConversation } from '@/lib/conversations';
import { sreLogger } from '@/lib/sre-logger';

/**
 * Creates or gets a private chat conversation between the current user and the target user.
 * This is a wrapper around getOrCreateConversation that handles current user fetching.
 */
export const createOrGetPrivateChat = async (otherUserId: string): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    return await getOrCreateConversation({
      hostId: otherUserId,
      coworkerId: user.id
    });
  } catch (error) {
    sreLogger.error('Error in createOrGetPrivateChat:', { otherUserId }, error as Error);
    toast.error('Failed to start conversation');
    throw error;
  }
};

/**
 * Sends a connection request to another user.
 */
export const sendConnectionRequest = async (receiverId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to connect.");
      return false;
    }

    const { error } = await supabase
      .from('connections')
      .insert([
        {
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending',
          expires_at: new Date(Date.now() + TIME_CONSTANTS.CONNECTION_REQUEST_EXPIRY).toISOString(),
        },
      ]);

    if (error) {
      sreLogger.error('Error sending connection request', { receiverId }, error);
      toast.error("Failed to send connection request.");
      return false;
    } else {
      toast.success("Connection request sent successfully!");
      return true;
    }
  } catch (err: unknown) {
    sreLogger.error('Unexpected error sending connection request', {}, err as Error);
    toast.error("An unexpected error occurred.");
    return false;
  }
};

/**
 * Accepts a connection request.
 */
export const acceptConnectionRequest = async (connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId);

    if (error) {
      sreLogger.error('Error accepting connection request', { connectionId }, error);
      toast.error("Failed to accept connection request.");
      return false;
    } else {
      toast.success("Connection request accepted successfully!");
      return true;
    }
  } catch (err: unknown) {
    sreLogger.error('Unexpected error accepting connection request', {}, err as Error);
    toast.error("An unexpected error occurred.");
    return false;
  }
};

/**
 * Rejects a connection request.
 */
export const rejectConnectionRequest = async (connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      sreLogger.error('Error rejecting connection request', { connectionId }, error);
      toast.error("Failed to reject connection request.");
      return false;
    } else {
      toast.success("Connection request rejected successfully!");
      return true;
    }
  } catch (err: unknown) {
    sreLogger.error('Unexpected error rejecting connection request', {}, err as Error);
    toast.error("An unexpected error occurred.");
    return false;
  }
};

/**
 * Removes an existing connection.
 */
export const removeConnection = async (connectionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      sreLogger.error('Error removing connection', { connectionId }, error);
      toast.error("Failed to remove connection.");
      return false;
    } else {
      toast.success("Connection removed successfully!");
      return true;
    }
  } catch (err: unknown) {
    sreLogger.error('Unexpected error removing connection', {}, err as Error);
    toast.error("An unexpected error occurred.");
    return false;
  }
};
