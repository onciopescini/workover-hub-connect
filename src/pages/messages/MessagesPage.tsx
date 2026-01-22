import React from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '@/hooks/chat/useChat';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';

const MessagesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Initialize hook with active conversation ID if present
  const {
    conversations,
    activeMessages,
    currentUser,
    isLoading,
    isMessagesLoading,
    sendMessage,
    messagesEndRef
  } = useChat(id);

  const activeConversation = conversations.find(c => c.id === id);

  return (
    <div className="container mx-auto p-0 md:p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-4 hidden md:block px-2">Messaggi</h1>

      <ChatLayout
        sidebar={
          <ConversationList
            conversations={conversations}
            currentUser={currentUser}
            isLoading={isLoading}
          />
        }
      >
        <ChatWindow
          messages={activeMessages}
          currentUser={currentUser}
          isLoading={isMessagesLoading}
          onSendMessage={sendMessage}
          messagesEndRef={messagesEndRef}
          activeConversation={activeConversation}
        />
      </ChatLayout>
    </div>
  );
};

export default MessagesPage;
