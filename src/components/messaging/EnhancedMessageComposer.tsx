
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Smile, Image, FileText, Mic } from "lucide-react";
import { toast } from "sonner";

interface EnhancedMessageComposerProps {
  onSend: (message: string, attachments?: File[]) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export const EnhancedMessageComposer = ({ 
  onSend, 
  placeholder = "Scrivi un messaggio...", 
  disabled = false 
}: EnhancedMessageComposerProps) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || isLoading) return;

    try {
      setIsLoading(true);
      await onSend(message.trim(), attachments);
      setMessage("");
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Errore nell'invio del messaggio");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit
    
    if (validFiles.length !== files.length) {
      toast.error("Alcuni file sono troppo grandi (max 10MB)");
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t bg-white p-4 space-y-3">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              {file.type.startsWith('image/') ? (
                <Image className="w-4 h-4 text-blue-500" />
              ) : (
                <FileText className="w-4 h-4 text-gray-500" />
              )}
              <span className="truncate max-w-32">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end gap-2">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="text-gray-500 hover:text-gray-700"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || isLoading}
            className="text-gray-500 hover:text-gray-700"
          >
            <Smile className="w-4 h-4" />
          </Button>
        </div>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="min-h-10 max-h-32 resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <Button
          onClick={handleSend}
          disabled={disabled || isLoading || (!message.trim() && attachments.length === 0)}
          className="px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx"
      />
    </div>
  );
};
