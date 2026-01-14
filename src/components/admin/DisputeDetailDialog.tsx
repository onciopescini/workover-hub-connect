import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, RefreshCcw, Save } from "lucide-react";

interface DisputeDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: any; // We'll refine this type
  onUpdate: () => void;
}

export function DisputeDetailDialog({ isOpen, onClose, dispute, onUpdate }: DisputeDetailDialogProps) {
  const [notes, setNotes] = useState(dispute?.admin_notes || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync notes when dispute changes
  React.useEffect(() => {
    setNotes(dispute?.admin_notes || "");
  }, [dispute]);

  if (!dispute) return null;

  const handleStatusUpdate = async (newStatus: "resolved" | "refunded") => {
    try {
      setIsUpdating(true);

      if (newStatus === "refunded") {
        const { error } = await supabase.functions.invoke('admin-process-refund', {
          body: { disputeId: dispute.id }
        });

        if (error) throw error;
        toast.success("Refund processed via Stripe and status updated");
      } else {
        const { error } = await supabase
          .from("disputes")
          .update({ status: newStatus })
          .eq("id", dispute.id);

        if (error) throw error;
        toast.success(`Dispute marked as ${newStatus}`);
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error("Error updating dispute:", error);
      // Try to parse the error message if it comes from the Edge Function
      let errorMessage = "Failed to update dispute status";
      if (error.message) errorMessage = error.message;
      try {
        const body = JSON.parse(error.message);
        if (body.error) errorMessage = body.error;
      } catch (e) {
        // Not a JSON string
      }

      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("disputes")
        .update({ admin_notes: notes })
        .eq("id", dispute.id);

      if (error) throw error;

      toast.success("Admin notes saved");
      onUpdate();
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setIsUpdating(false);
    }
  };

  const booking = dispute.bookings;
  const opener = dispute.profiles;
  const amount = dispute.amount || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Dispute Details</span>
            <Badge
              variant={
                dispute.status === 'resolved' ? 'default' :
                dispute.status === 'refunded' ? 'secondary' :
                'destructive'
              }
              className={dispute.status === 'resolved' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              {dispute.status.toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            ID: {dispute.id} | Created: {format(new Date(dispute.created_at), "PPP")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500">OPENED BY</h4>
              <p className="font-medium">{opener?.first_name} {opener?.last_name}</p>
              <p className="text-sm text-gray-500">{opener?.email}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-500">BOOKING DETAILS</h4>
              <p className="font-medium">Date: {format(new Date(booking?.booking_date), "PPP")}</p>
              <p className="text-sm">Amount: €{amount.toFixed(2)}</p>
              <p className="text-xs text-gray-400">Booking ID: {booking?.id}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-500">REASON</h4>
            <div className="bg-gray-50 p-4 rounded-md text-sm whitespace-pre-wrap border">
              {dispute.reason}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-500">ADMIN NOTES</h4>
            <div className="flex gap-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about the decision..."
                className="resize-none"
              />
            </div>
            <div className="flex justify-end">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveNotes}
                    disabled={isUpdating}
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
            <div className="text-xs text-gray-400 self-center">
                Actions strictly update database status only.
            </div>
            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    onClick={() => handleStatusUpdate("refunded")}
                    disabled={isUpdating || dispute.status === 'refunded'}
                    className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Process Refund
                </Button>
                <Button
                    onClick={() => handleStatusUpdate("resolved")}
                    disabled={isUpdating || dispute.status === 'resolved'}
                    className="bg-green-600 hover:bg-green-700"
                >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Resolved
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
