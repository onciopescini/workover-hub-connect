import React from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { MessagesUnauthenticated } from "@/components/messaging/MessagesUnauthenticated";
import { UnifiedMessages } from "@/components/messaging/UnifiedMessages";

const Messages = () => {
  const { authState } = useAuth();

  if (!authState.isAuthenticated) {
    return <MessagesUnauthenticated />;
  }

  return (
    <div className="container max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
      <UnifiedMessages />
    </div>
  );
};

export default Messages;
