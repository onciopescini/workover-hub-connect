import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import { MessagesPageHeader } from "@/components/messaging/MessagesPageHeader";
import { MessagesTabsManager } from "@/components/messaging/MessagesTabsManager";
import { MessagesChatArea } from "@/components/messaging/MessagesChatArea";
import { MessagesSettingsDialog } from "@/components/messaging/MessagesSettingsDialog";
import { useMessagesData } from "@/hooks/useMessagesData";
import { useAuth } from "@/hooks/auth/useAuth";
import { MessagesUnauthenticated } from "@/components/messaging/MessagesUnauthenticated";
import { ConversationSearchBar } from "@/components/messaging/ConversationSearchBar";

export default function ModernMessages() {
  const [activeTab, setActiveTab] = useState<'all' | 'bookings' | 'private'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { authState } = useAuth();

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

  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="w-full h-full bg-background flex flex-col">
        <div className="container mx-auto px-4 py-6 max-w-[1800px] flex-1 flex flex-col overflow-hidden">
          <MessagesPageHeader
            onNewChat={() => navigate('/networking')}
            onSettings={() => setSettingsOpen(true)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 mt-6">
            {/* Sidebar - Lista conversazioni */}
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full">
              <ConversationSearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
              />
              
              <div className="mt-4 flex-1 min-h-0">
                <MessagesTabsManager
                  activeTab={activeTab}
                  onTabChange={(tab) => setActiveTab(tab as 'all' | 'bookings' | 'private')}
                  conversations={filteredConversations}
                  selectedId={selectedConversationId}
                  onSelectConversation={setSelectedConversationId}
                  getTabCount={getTabCount}
                />
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="lg:col-span-8 xl:col-span-9 h-full">
              <MessagesChatArea
                selectedConversation={selectedConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>

          <MessagesSettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}
