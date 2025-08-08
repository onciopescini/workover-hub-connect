
import React, { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { renderTemplate, listAllowedVariables } from "@/utils/messages/templateRenderer";
import { useAuth } from "@/hooks/auth/useAuth";
import type { BookingWithDetails } from "@/types/booking";

type BulkAction = "confirm" | "cancel" | "message";

interface BulkSelectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: BookingWithDetails[];
  onConfirm: (ids: string[]) => Promise<void>;
  onCancel: (ids: string[], reason: string) => Promise<void>;
  onGroupMessage: (ids: string[], content: string) => Promise<void>;
  isProcessing?: boolean;
  defaultAction?: BulkAction;
}

export const BulkSelectionDrawer: React.FC<BulkSelectionDrawerProps> = ({
  open,
  onOpenChange,
  bookings,
  onConfirm,
  onCancel,
  onGroupMessage,
  isProcessing,
  defaultAction = "confirm",
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<BulkAction>(defaultAction);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const { authState } = useAuth();

  const selectedBookings = useMemo(
    () => bookings.filter((b) => selected.has(b.id)),
    [bookings, selected]
  );

  const toggleSelection = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const allSelected = selected.size === bookings.length && bookings.length > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(bookings.map((b) => b.id)));
    }
  };

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedBookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    return counts;
  }, [selectedBookings]);

  const runAction = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    if (action === "confirm") {
      await onConfirm(ids);
    } else if (action === "cancel") {
      await onCancel(ids, reason);
    } else {
      // message: render variabili per singola prenotazione (invio uno a uno già nel hook)
      await onGroupMessage(ids, message);
    }

    // Dopo azione chiudo e resetto
    setSelected(new Set());
    setReason("");
    setMessage("");
    onOpenChange(false);
  };

  const previewText = useMemo(() => {
    if (action !== "message" || selectedBookings.length === 0 || !message) return "";
    const sample = selectedBookings[0]!;
    return renderTemplate(message, sample, {
      first_name: authState.profile?.first_name || "",
      last_name: authState.profile?.last_name || "",
    });
  }, [action, selectedBookings, message, authState.profile]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Azioni Bulk prenotazioni</SheetTitle>
          <SheetDescription>
            Seleziona una o più prenotazioni e applica un’azione. È richiesta una conferma con riepilogo.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Selettore azione */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium min-w-28">Azione</label>
                <div className="flex items-center gap-3">
                  {[
                    { key: "confirm", label: "Conferma" },
                    { key: "cancel", label: "Annulla" },
                    { key: "message", label: "Messaggio di gruppo" },
                  ].map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="bulk_action"
                        value={opt.key}
                        checked={action === (opt.key as BulkAction)}
                        onChange={() => setAction(opt.key as BulkAction)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {action === "cancel" && (
                <div className="flex items-start gap-3">
                  <label className="text-sm font-medium min-w-28 mt-2">Motivo</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    placeholder="Facoltativo, verrà registrato sulla prenotazione"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}

              {action === "message" && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <label className="text-sm font-medium min-w-28 mt-2">Messaggio</label>
                    <textarea
                      className="w-full border rounded-md p-2 text-sm"
                      rows={5}
                      placeholder="Scrivi il tuo messaggio. Variabili supportate: es. {{space_title}}, {{booking_date}}, {{start_time}}, {{end_time}}, {{guest_first_name}}"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Variabili disponibili: {listAllowedVariables().join(", ")}
                  </div>
                  {previewText && (
                    <div className="p-3 rounded-md bg-muted/50">
                      <div className="text-xs font-medium mb-1">Anteprima (prima prenotazione selezionata)</div>
                      <div className="text-sm whitespace-pre-wrap">{previewText}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista prenotazioni con checkbox */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Seleziona prenotazioni</div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  Seleziona tutto
                </label>
              </div>

              <div className="max-h-[320px] overflow-auto divide-y">
                {bookings.map((b) => (
                  <label key={b.id} className="flex items-start gap-3 p-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(b.id)}
                      onChange={() => toggleSelection(b.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-medium">{b.space?.title || "Spazio"}</div>
                        <Badge variant="secondary" className="capitalize">
                          {b.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {b.booking_date} • {b.start_time} - {b.end_time} • {b.coworker?.first_name} {b.coworker?.last_name}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Riepilogo */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm font-medium mb-2">Riepilogo</div>
              <div className="text-sm">
                Selezionate: <strong>{selected.size}</strong>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(countsByStatus).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="capitalize">
                    {k}: {v}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <SheetFooter className="mt-4">
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Annulla
            </Button>
            <Button onClick={runAction} disabled={isProcessing || selected.size === 0}>
              {action === "confirm" && "Conferma selezionate"}
              {action === "cancel" && "Annulla selezionate"}
              {action === "message" && "Invia messaggio di gruppo"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default BulkSelectionDrawer;
