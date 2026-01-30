import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '@/hooks/chat/useChat';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatDetailsPanel } from '@/components/chat/ChatDetailsPanel';

const MessagesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  // Initialize hook with active conversation ID if present
  const {
    conversations,
    activeMessages,
    currentUser,
    isLoading,
    isMessagesLoading,
    sendMessage,
    messagesEndRef,
    deleteMessage,
    archiveConversation,
    markConversationUnread
  } = useChat(id);

  const activeConversation = conversations.find(c => c.id === id);

  const handleToggleDetails = () => {
    setShowDetailsPanel(prev => !prev);
  };

  return (
    <div className="container mx-auto p-0 md:p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-4 hidden md:block px-2">Messaggi</h1>

      <ChatLayout
        sidebar={
          <ConversationList
            conversations={conversations}
            currentUser={currentUser}
            isLoading={isLoading}
          />
        }
        detailsPanel={
          <ChatDetailsPanel
            conversation={activeConversation}
            currentUserId={currentUser?.id}
            isOpen={showDetailsPanel}
            onClose={() => setShowDetailsPanel(false)}
          />
        }
        showDetails={showDetailsPanel && !!activeConversation}
      >
        <ChatWindow
          messages={activeMessages}
          currentUser={currentUser}
          isLoading={isMessagesLoading}
          onSendMessage={sendMessage}
          onDeleteMessage={deleteMessage}
          onArchiveConversation={archiveConversation}
          onMarkConversationUnread={markConversationUnread}
          messagesEndRef={messagesEndRef}
          activeConversation={activeConversation}
          onToggleDetails={handleToggleDetails}
          showDetails={showDetailsPanel}
        />
      </ChatLayout>
    </div>
  );
};

export default MessagesPage;
