
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageList } from "./MessageList";

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingTitle: string;
}

export function MessageDialog({ open, onOpenChange, bookingId, bookingTitle }: MessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Messages - {bookingTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <MessageList bookingId={bookingId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MessageDialog;
