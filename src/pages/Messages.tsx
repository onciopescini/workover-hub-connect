
import React, { useState } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { useMessagesData } from "@/hooks/useMessagesData";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { MessagesPageHeader } from "@/components/messaging/MessagesPageHeader";
import { MessagesTabsManager } from "@/components/messaging/MessagesTabsManager";
import { MessagesChatArea } from "@/components/messaging/MessagesChatArea";
import { MessagesUnauthenticated } from "@/components/messaging/MessagesUnauthenticated";

const Messages = () => {
  const { authState } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const { availableHeight } = useViewportHeight();
  
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
      <div className="flex-1 max-w-7xl mx-auto p-4 w-full flex flex-col">
        <MessagesPageHeader />

        {/* Main Content - Flexible layout with calculated height */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0"
          style={{ height: `${availableHeight}px` }}
        >
          {/* Sidebar - Flexible container */}
          <div className="lg:col-span-1 flex flex-col h-full min-h-0">
            <MessagesTabsManager
              activeTab={activeTab}
              onTabChange={setActiveTab}
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              getTabCount={getTabCount}
            />
          </div>

          {/* Messages Area - Flexible container */}
          <div className="lg:col-span-3 flex flex-col h-full min-h-0">
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
