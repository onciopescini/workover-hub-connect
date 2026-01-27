
import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateConversation(params: {
  hostId: string;
  coworkerId: string;
  spaceId: string;
  bookingId?: string;
}) {
  const { hostId, coworkerId, spaceId, bookingId } = params;

  // 1. Check if conversation already exists for these participants
  // We can't easily query "participants contains A AND participants contains B" via simple REST
  // But usually we can query by booking_id if available, or try an RPC if one exists.
  // For now, let's try querying conversations where booking_id matches, as that's 1:1 usually.

  if (bookingId) {
    const { data: existingByBooking, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (!error && existingByBooking) {
      return existingByBooking.id;
    }
  }

  // If no booking_id or not found, we create a new one.
  // Note: ideally we should avoid duplicates by checking participants, but RLS/security might limit us.
  // Let's create a new conversation.
  
  // Build insert data with required fields
  const insertData: {
    host_id: string;
    coworker_id: string;
    booking_id?: string | null;
    space_id?: string | null;
  } = {
    host_id: hostId,
    coworker_id: coworkerId
  };
  
  // Only add optional fields if they are provided
  if (bookingId) {
    insertData.booking_id = bookingId;
  }
  if (spaceId) {
    insertData.space_id = spaceId;
  }

  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert(insertData)
    .select()
    .single();

  if (createError) throw createError;

  // Add participants
  const participants = [
    { conversation_id: newConv.id, user_id: hostId },
    { conversation_id: newConv.id, user_id: coworkerId }
  ];

  const { error: partError } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partError) throw partError;

  return newConv.id;
}
