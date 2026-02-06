/**
 * AttachmentPreview - Renders image thumbnails or file icons in message bubbles
 */

import React, { useState } from 'react';
import { FileText, Download, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { MessageAttachment } from '@/types/chat';
import { cn } from '@/lib/utils';

interface AttachmentPreviewProps {
  attachments: MessageAttachment[];
  isMe: boolean;
}

interface SingleAttachmentProps {
  attachment: MessageAttachment;
  isMe: boolean;
  onClick?: () => void;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ImageAttachment: React.FC<SingleAttachmentProps> = ({ attachment, isMe, onClick }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="block rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity max-w-[200px]"
    >
      {isLoading && !hasError && (
        <div className="h-32 w-32 flex items-center justify-center bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {hasError ? (
        <div className="h-32 w-32 flex flex-col items-center justify-center bg-muted gap-2">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Immagine non disponibile</span>
        </div>
      ) : (
        <img
          src={attachment.url}
          alt={attachment.name}
          className={cn(
            "max-h-48 max-w-full object-cover rounded-lg",
            isLoading && "hidden"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </button>
  );
};

const FileAttachment: React.FC<SingleAttachmentProps> = ({ attachment, isMe }) => {
  const handleDownload = () => {
    window.open(attachment.url, '_blank');
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg border max-w-[240px]",
        isMe 
          ? "bg-primary-foreground/10 border-primary-foreground/20" 
          : "bg-muted/50 border-border"
      )}
    >
      <div className={cn(
        "h-10 w-10 flex items-center justify-center rounded",
        isMe ? "bg-primary-foreground/20" : "bg-muted"
      )}>
        <FileText className={cn(
          "h-5 w-5",
          isMe ? "text-primary-foreground" : "text-muted-foreground"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isMe ? "text-primary-foreground" : "text-foreground"
        )}>
          {attachment.name}
        </p>
        {attachment.size && (
          <p className={cn(
            "text-xs",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatFileSize(attachment.size)}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 flex-shrink-0",
          isMe && "text-primary-foreground hover:bg-primary-foreground/20"
        )}
        onClick={handleDownload}
        title="Scarica file"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ 
  attachments, 
  isMe 
}) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-2 mt-2">
        {attachments.map((attachment, index) => (
          <div key={index}>
            {attachment.type === 'image' ? (
              <ImageAttachment
                attachment={attachment}
                isMe={isMe}
                onClick={() => setLightboxImage(attachment.url)}
              />
            ) : (
              <FileAttachment attachment={attachment} isMe={isMe} />
            )}
          </div>
        ))}
      </div>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-none">
          <DialogTitle className="sr-only">Anteprima immagine</DialogTitle>
          {lightboxImage && (
            <div className="relative">
              <img
                src={lightboxImage}
                alt="Anteprima"
                className="max-h-[80vh] max-w-full mx-auto object-contain"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => window.open(lightboxImage, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Apri
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
