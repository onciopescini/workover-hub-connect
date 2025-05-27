
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flag } from "lucide-react";
import { createReport } from "@/lib/report-utils";
import { REPORT_REASONS } from "@/types/report";

interface ReportDialogProps {
  targetType: "user" | "space" | "booking" | "event" | "message";
  targetId: string;
  triggerText?: string;
  className?: string;
}

const ReportDialog = ({ targetType, targetId, triggerText = "Segnala", className }: ReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      return;
    }

    setIsSubmitting(true);
    
    const success = await createReport({
      target_type: targetType,
      target_id: targetId,
      reason: reason as any,
      description: description.trim() || undefined
    });

    if (success) {
      setOpen(false);
      setReason("");
      setDescription("");
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Flag className="w-4 h-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Segnala contenuto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reason">Motivo della segnalazione *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_REASONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Descrizione aggiuntiva (opzionale)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fornisci dettagli aggiuntivi sulla segnalazione..."
              className="min-h-[100px]"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={!reason || isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Invio..." : "Invia segnalazione"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
