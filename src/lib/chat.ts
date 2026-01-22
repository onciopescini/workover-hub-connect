import { ChatParticipant } from "@/types/chat";

export const getOtherParticipant = (participants: ChatParticipant[], currentUserId: string | null): ChatParticipant | undefined => {
  if (!currentUserId) return participants[0];
  return participants.find((p) => p.id !== currentUserId) || participants[0];
};
