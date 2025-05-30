
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { reviewSpaceRevision } from "@/lib/space-moderation-utils";
import { CheckCircle, XCircle } from "lucide-react";

interface AdminSpaceRevisionDialogProps {
  spaceId: string;
  spaceTitle: string;
  hostRevisionNotes: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminSpaceRevisionDialog({
  spaceId,
  spaceTitle,
  hostRevisionNotes,
  isOpen,
  onClose,
  onUpdate
}: AdminSpaceRevisionDialogProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReview = async (approved: boolean) => {
    setIsSubmitting(true);
    const success = await reviewSpaceRevision(spaceId, approved, adminNotes.trim() || undefined);
    
    if (success) {
      onUpdate();
      onClose();
      setAdminNotes("");
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setAdminNotes("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revisione Spazio Sospeso</DialogTitle>
          <DialogDescription>
            Rivedi le modifiche apportate dall'host al spazio "{spaceTitle}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Note dell'host:</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded border">
              <p className="text-sm text-gray-700">{hostRevisionNotes}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="admin-notes" className="text-sm font-medium">
              Note amministratore (opzionali)
            </Label>
            <Textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Aggiungi note per l'host..."
              className="min-h-[80px] mt-1"
              disabled={isSubmitting}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Approva:</strong> Lo spazio sarà ripubblicato e l'host potrà creare nuovi annunci.
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Rifiuta:</strong> Lo spazio rimane sospeso e l'host può apportare ulteriori modifiche.
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleReview(false)}
            disabled={isSubmitting}
            className="flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            {isSubmitting ? "Elaborando..." : "Rifiuta"}
          </Button>
          <Button
            onClick={() => handleReview(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            {isSubmitting ? "Elaborando..." : "Approva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
