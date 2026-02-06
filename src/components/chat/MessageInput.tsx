/**
 * MessageInput - Chat input with attachment support
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useChatUpload } from '@/hooks/chat/useChatUpload';
import type { MessageAttachment } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: MessageAttachment[]) => void;
  userId: string;
  conversationId: string;
  disabled?: boolean;
}

interface PendingFile {
  file: File;
  preview: string | null;
  isImage: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  userId,
  conversationId,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadMultipleFiles, isUploading, validateFile, allowedTypes } = useChatUpload({
    userId,
    conversationId
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate and add files
    const validFiles: PendingFile[] = [];
    
    for (const file of files) {
      const error = validateFile(file);
      if (error) continue; // Skip invalid files (toast shown by validateFile)

      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : null;
      
      validFiles.push({ file, preview, isImage });
    }

    setPendingFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => {
      const newFiles = [...prev];
      // Revoke preview URL if exists
      const fileToRemove = newFiles[index];
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const hasContent = inputValue.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    
    if (!hasContent && !hasFiles) return;
    if (isSending || isUploading) return;

    setIsSending(true);

    try {
      let attachments: MessageAttachment[] = [];

      // Upload pending files first
      if (hasFiles) {
        const filesToUpload = pendingFiles.map(pf => pf.file);
        attachments = await uploadMultipleFiles(filesToUpload);
      }

      // Send message with content and/or attachments
      const content = hasContent ? inputValue : (attachments.length > 0 ? '📎 Allegato' : '');
      
      if (content || attachments.length > 0) {
        onSendMessage(content, attachments.length > 0 ? attachments : undefined);
      }

      // Clean up
      pendingFiles.forEach(pf => {
        if (pf.preview) URL.revokeObjectURL(pf.preview);
      });
      setPendingFiles([]);
      setInputValue('');
    } finally {
      setIsSending(false);
    }
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const isDisabled = disabled || isSending || isUploading;
  const canSend = (inputValue.trim().length > 0 || pendingFiles.length > 0) && !isDisabled;

  return (
    <div className="p-4 bg-background border-t space-y-3">
      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((pf, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 p-2 bg-muted rounded-lg border"
            >
              {pf.isImage && pf.preview ? (
                <img
                  src={pf.preview}
                  alt={pf.file.name}
                  className="h-12 w-12 object-cover rounded"
                />
              ) : (
                <div className="h-12 w-12 flex items-center justify-center bg-muted-foreground/10 rounded">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 max-w-[120px]">
                <p className="text-xs font-medium truncate">{pf.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(pf.file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <form onSubmit={handleSend} className="flex gap-2 items-center">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Seleziona file da allegare"
        />

        {/* Paperclip Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlePaperclipClick}
          disabled={isDisabled || pendingFiles.length >= 5}
          className="flex-shrink-0"
          title="Allega file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Text Input */}
        <label htmlFor="chat-input" className="sr-only">
          Scrivi un messaggio
        </label>
        <Input
          id="chat-input"
          aria-label="Scrivi un messaggio"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1"
          disabled={isDisabled}
          autoFocus
        />

        {/* Send Button */}
        <Button 
          type="submit" 
          size="icon" 
          disabled={!canSend}
          className="flex-shrink-0"
        >
          {isSending || isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};
