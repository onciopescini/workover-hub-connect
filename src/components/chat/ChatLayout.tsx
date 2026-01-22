import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useParams } from 'react-router-dom';

interface ChatLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ children, sidebar }) => {
  const isMobile = useIsMobile();
  const { id } = useParams(); // Check if we are in a conversation

  // Mobile View Logic
  if (isMobile) {
    // If we have an ID, show only the Chat Window (children)
    // If we don't have an ID, show only the Sidebar
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        {id ? (
          <div className="flex-1 overflow-hidden h-full">
            {children}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden h-full">
            {sidebar}
          </div>
        )}
      </div>
    );
  }

  // Desktop View Logic
  return (
    <div className="flex h-[calc(100vh-6rem)] border rounded-lg overflow-hidden bg-background shadow-sm mt-4">
      <aside className="w-80 border-r bg-muted/10 flex flex-col">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        {children}
      </main>
    </div>
  );
};
