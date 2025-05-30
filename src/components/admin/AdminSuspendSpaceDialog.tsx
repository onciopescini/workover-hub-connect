
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, Users } from "lucide-react";
import { suspendSpaceWithBookings } from "@/lib/space-moderation-utils";

interface AdminSuspendSpaceDialogProps {
  spaceId: string;
  spaceTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activeBookingsCount?: number;
}

export function AdminSuspendSpaceDialog({ 
  spaceId, 
  spaceTitle, 
  isOpen, 
  onClose, 
  onConfirm,
  activeBookingsCount = 0
}: AdminSuspendSpaceDialogProps) {
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuspend = async () => {
    if (!suspensionReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    const success = await suspendSpaceWithBookings(spaceId, suspensionReason.trim());
    
    if (success) {
      onConfirm();
      onClose();
      setSuspensionReason("");
    }
    
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setSuspensionReason("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Sospendi Spazio
          </DialogTitle>
          <DialogDescription>
            Stai per sospendere lo spazio "{spaceTitle}". Questa azione avrà conseguenze importanti.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="space-y-2">
                <p className="font-medium">Conseguenze della sospensione:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Lo spazio sarà nascosto dalla ricerca pubblica</li>
                  <li>L'host non potrà creare nuovi spazi</li>
                  {activeBookingsCount > 0 && (
                    <li className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {activeBookingsCount} prenotazione/i attive verranno cancellate
                    </li>
                  )}
                  <li className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    I coworker riceveranno rimborsi completi
                  </li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="suspension-reason" className="text-sm font-medium">
              Motivo della sospensione *
            </Label>
            <Textarea
              id="suspension-reason"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="Descrivi il motivo della sospensione..."
              className="min-h-[100px] mt-1"
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={isSubmitting || !suspensionReason.trim()}
          >
            {isSubmitting ? "Sospendendo..." : "Sospendi Spazio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
