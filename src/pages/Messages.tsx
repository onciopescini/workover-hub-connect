
import React, { useState } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { useMessagesData } from "@/hooks/useMessagesData";
import { MessagesPageHeader } from "@/components/messaging/MessagesPageHeader";
import { MessagesTabsManager } from "@/components/messaging/MessagesTabsManager";
import { MessagesChatArea } from "@/components/messaging/MessagesChatArea";
import { MessagesUnauthenticated } from "@/components/messaging/MessagesUnauthenticated";

const Messages = () => {
  const { authState } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  
  const {
    selectedConversationId,
    setSelectedConversationId,
    conversations,
    messages,
    isLoading,
    handleSendMessage,
    getTabCount
  } = useMessagesData(activeTab);

  if (!authState.isAuthenticated) {
    return <MessagesUnauthenticated />;
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <MessagesPageHeader />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <MessagesTabsManager
              activeTab={activeTab}
              onTabChange={setActiveTab}
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              getTabCount={getTabCount}
            />
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-3">
            {selectedConversation && (
              <MessagesChatArea
                selectedConversation={selectedConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
