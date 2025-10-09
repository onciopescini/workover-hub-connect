import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, X, Download, Trash2 } from "lucide-react";
import { AdminSpace } from "@/types/admin";
import { toast } from "sonner";
import { moderateSpace } from "@/lib/admin/admin-space-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BulkSpaceActionsProps = {
  spaces: AdminSpace[];
  onUpdate: () => void;
};

export function BulkSpaceActions({ spaces, onUpdate }: BulkSpaceActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === spaces.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(spaces.map(s => s.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) {
      toast.error("Seleziona spazi e un'azione");
      return;
    }

    setIsProcessing(true);

    try {
      const promises = Array.from(selectedIds).map(async (spaceId) => {
        if (bulkAction === "approve") {
          return moderateSpace(spaceId, true);
        } else if (bulkAction === "reject") {
          return moderateSpace(spaceId, false, "Rifiuto di massa");
        }
      });

      await Promise.all(promises);

      toast.success(`${selectedIds.size} spazi ${bulkAction === "approve" ? "approvati" : "rifiutati"}`);
      setSelectedIds(new Set());
      setBulkAction("");
      setConfirmDialog(false);
      onUpdate();
    } catch (error) {
      console.error("Bulk action error:", error);
      toast.error("Errore nell'azione di massa");
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToCSV = () => {
    const selectedSpaces = spaces.filter(s => selectedIds.has(s.id));
    
    const headers = ["ID", "Titolo", "Indirizzo", "Categoria", "Stato", "Prezzo Ora", "Prezzo Giorno", "Capacità", "Data Creazione"];
    const rows = selectedSpaces.map(s => [
      s.id,
      s.title,
      s.address,
      s.category,
      s.published ? "Pubblicato" : s.pending_approval ? "In Attesa" : "Non Pubblicato",
      s.price_per_hour,
      s.price_per_day,
      s.max_capacity,
      new Date(s.created_at).toLocaleDateString("it-IT")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `spaces_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success(`Esportati ${selectedSpaces.length} spazi`);
  };

  const selectedCount = selectedIds.size;
  const canBulkApprove = spaces.filter(s => selectedIds.has(s.id) && s.pending_approval).length > 0;
  const canBulkReject = selectedCount > 0;

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedCount} selezionati
              </Badge>
              
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleziona azione" />
                </SelectTrigger>
                <SelectContent>
                  {canBulkApprove && (
                    <SelectItem value="approve">Approva selezionati</SelectItem>
                  )}
                  {canBulkReject && (
                    <SelectItem value="reject">Rifiuta selezionati</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {bulkAction && (
                <Button
                  onClick={() => setConfirmDialog(true)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Elaborazione..." : "Esegui"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Esporta CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Deseleziona tutto
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Selection Header */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Checkbox
          checked={selectedIds.size === spaces.length && spaces.length > 0}
          onCheckedChange={toggleAll}
        />
        <span className="text-sm text-muted-foreground">
          {selectedIds.size === spaces.length && spaces.length > 0
            ? "Deseleziona tutto"
            : "Seleziona tutto"}
        </span>
      </div>

      {/* Space Items with Checkboxes */}
      <div className="space-y-2">
        {spaces.map((space) => (
          <div
            key={space.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              checked={selectedIds.has(space.id)}
              onCheckedChange={() => toggleSelection(space.id)}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{space.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {space.category}
                </Badge>
                {space.pending_approval && (
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    In Attesa
                  </Badge>
                )}
                {space.published && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    Pubblicato
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{space.address}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma azione di massa</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per {bulkAction === "approve" ? "approvare" : "rifiutare"} {selectedCount} spazi.
              Questa azione non può essere annullata facilmente. Continuare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction} disabled={isProcessing}>
              {isProcessing ? "Elaborazione..." : "Conferma"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
