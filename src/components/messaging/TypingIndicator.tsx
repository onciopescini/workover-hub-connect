import React from 'react';

interface TypingIndicatorProps {
  userName?: string;
}

export const TypingIndicator = ({ userName = "Someone" }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="italic">{userName} sta scrivendo...</span>
    </div>
  );
};
