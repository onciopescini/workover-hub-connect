import React, { useState, useEffect } from 'react';
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
import { useServerMessageSearch } from "@/hooks/useServerMessageSearch";
import { useDebouncedValue } from "@/hooks/useDebounce";

export default function ModernMessages() {
  const [activeTab, setActiveTab] = useState<'all' | 'bookings' | 'private'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { search, results, isSearching } = useServerMessageSearch();
  const debouncedSearch = useDebouncedValue(searchQuery, 500);

  const {
    selectedConversationId,
    setSelectedConversationId,
    conversations,
    messages,
    isLoading,
    handleSendMessage,
    getTabCount
  } = useMessagesData(activeTab);

  // Trigger server-side search when debounced query changes
  useEffect(() => {
    if (debouncedSearch.trim().length >= 3) {
      search(debouncedSearch);
    }
  }, [debouncedSearch, search]);

  if (!authState.isAuthenticated) {
    return <MessagesUnauthenticated />;
  }

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Use server-side search results if available, otherwise client-side filter
  const filteredConversations = debouncedSearch.trim().length >= 3 && results.length > 0
    ? conversations.filter(conv => 
        results.some(r => r.conversation_id === conv.id)
      )
    : conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="w-full bg-background flex flex-col h-screen overflow-hidden">
        <div className="container mx-auto px-4 py-6 max-w-[1800px] flex flex-col h-full">
          <MessagesPageHeader
            onNewChat={() => navigate('/networking')}
            onSettings={() => setSettingsOpen(true)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1 min-h-0">
            {/* Sidebar - Lista conversazioni */}
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-[calc(100vh-180px)]">
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
            <div className="lg:col-span-8 xl:col-span-9 h-[calc(100vh-180px)]">
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
