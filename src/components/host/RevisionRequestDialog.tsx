
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requestSpaceRevision } from "@/lib/space-moderation-utils";

interface RevisionRequestDialogProps {
  spaceId: string;
  spaceTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RevisionRequestDialog({
  spaceId,
  spaceTitle,
  isOpen,
  onClose,
  onSuccess
}: RevisionRequestDialogProps) {
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!revisionNotes.trim()) {
      return;
    }

    setIsSubmitting(true);
    const success = await requestSpaceRevision(spaceId, revisionNotes.trim());
    
    if (success) {
      onSuccess();
      onClose();
      setRevisionNotes("");
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setRevisionNotes("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Richiedi Revisione</DialogTitle>
          <DialogDescription>
            Richiedi all'amministrazione di rivedere le modifiche apportate a "{spaceTitle}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="revision-notes" className="text-sm font-medium">
              Descrivi le modifiche apportate *
            </Label>
            <Textarea
              id="revision-notes"
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Spiega cosa hai modificato per risolvere i problemi segnalati..."
              className="min-h-[120px] mt-1"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-600 mt-1">
              Fornisci dettagli chiari sulle modifiche per accelerare la revisione.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !revisionNotes.trim()}
          >
            {isSubmitting ? "Inviando..." : "Invia Richiesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
