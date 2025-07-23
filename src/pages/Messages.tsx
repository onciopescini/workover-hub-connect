
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { useMessagesData } from "@/hooks/useMessagesData";
import { MessagesPageHeader } from "@/components/messaging/MessagesPageHeader";
import { MessagesTabsManager } from "@/components/messaging/MessagesTabsManager";
import { MessagesChatArea } from "@/components/messaging/MessagesChatArea";
import { MessagesUnauthenticated } from "@/components/messaging/MessagesUnauthenticated";

const Messages = () => {
  const { authState } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [containerHeight, setContainerHeight] = useState("calc(100vh - 320px)");
  
  const {
    selectedConversationId,
    setSelectedConversationId,
    conversations,
    messages,
    isLoading,
    handleSendMessage,
    getTabCount
  } = useMessagesData(activeTab);

  // Calculate dynamic height based on user role and layout
  useEffect(() => {
    const calculateHeight = () => {
      const userRole = authState.profile?.role;
      const hasNavBar = userRole === "host" || userRole === "admin";
      
      // Base heights:
      // Main header: 64px
      // Navigation bar (if present): 44px
      // Page header: 64px
      // Footer: ~250px
      // Padding/margins: ~32px
      
      let totalOffset = 64 + 64 + 250 + 32; // 410px base
      
      if (hasNavBar) {
        totalOffset += 44; // Add nav bar height
      }
      
      // Add extra padding for mobile
      if (window.innerWidth < 768) {
        totalOffset += 20;
      }
      
      setContainerHeight(`calc(100vh - ${totalOffset}px)`);
    };

    calculateHeight();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [authState.profile?.role]);

  if (!authState.isAuthenticated) {
    return <MessagesUnauthenticated />;
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 max-w-7xl mx-auto p-4 w-full">
        <MessagesPageHeader />

        {/* Main Content - Dynamic height to avoid footer overlap */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          style={{ height: containerHeight, minHeight: '400px' }}
        >
          {/* Sidebar - Full height with internal scrolling */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <MessagesTabsManager
              activeTab={activeTab}
              onTabChange={setActiveTab}
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelectConversation={setSelectedConversationId}
              getTabCount={getTabCount}
            />
          </div>

          {/* Messages Area - Full height with internal scrolling */}
          <div className="lg:col-span-3 flex flex-col h-full">
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
