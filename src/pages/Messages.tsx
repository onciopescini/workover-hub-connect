
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto p-4 w-full">
        <MessagesPageHeader />

        {/* Main Content - Fixed height to avoid footer overlap */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Sidebar - Fixed height with internal scrolling */}
          <div className="lg:col-span-1 flex flex-col">
            <MessagesTabsManager
              activeTab={activeTab}
              onTabChange={setActiveTab}
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              getTabCount={getTabCount}
            />
          </div>

          {/* Messages Area - Fixed height with internal scrolling */}
          <div className="lg:col-span-3 flex flex-col">
            <MessagesChatArea
              selectedConversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
