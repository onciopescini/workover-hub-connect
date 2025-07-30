import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Plus, Trash2, Edit, X } from "lucide-react";
import { type AvailabilityData, type AvailabilityException } from "@/types/availability";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface BlockingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  availability: AvailabilityData;
  onAvailabilityChange: (availability: AvailabilityData) => void;
  selectedDate?: string | null;
}

interface BlockFormData {
  date: string;
  note: string;
}

export const BlockingPanel = ({
  isOpen,
  onClose,
  availability,
  onAvailabilityChange,
  selectedDate
}: BlockingPanelProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [formData, setFormData] = useState<BlockFormData>({
    date: selectedDate || '',
    note: ''
  });

  // Get all blocked dates with notes
  const blockedDates = useMemo(() => {
    return availability.exceptions
      .filter(exception => !exception.enabled)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [availability.exceptions]);

  // Reset form
  const resetForm = () => {
    setFormData({
      date: selectedDate || '',
      note: ''
    });
    setIsAdding(false);
    setEditingBlock(null);
  };

  // Add new block
  const addBlock = () => {
    if (!formData.date) return;

    const newException: AvailabilityException = {
      date: formData.date,
      enabled: false // blocked
    };

    // Store note in a custom way (extend the exception with note)
    const extendedException = {
      ...newException,
      note: formData.note
    };

    const newAvailability = {
      ...availability,
      exceptions: [
        ...availability.exceptions.filter(e => e.date !== formData.date),
        extendedException
      ]
    };

    onAvailabilityChange(newAvailability);
    resetForm();
  };

  // Edit existing block
  const editBlock = (date: string) => {
    const block = availability.exceptions.find(e => e.date === date);
    if (block) {
      setFormData({
        date: block.date,
        note: (block as any).note || ''
      });
      setEditingBlock(date);
      setIsAdding(true);
    }
  };

  // Update block
  const updateBlock = () => {
    if (!editingBlock) return;

    const updatedExceptions = availability.exceptions.map(exception => {
      if (exception.date === editingBlock) {
        return {
          ...exception,
          note: formData.note
        };
      }
      return exception;
    });

    onAvailabilityChange({
      ...availability,
      exceptions: updatedExceptions
    });

    resetForm();
  };

  // Remove block
  const removeBlock = (date: string) => {
    const newAvailability = {
      ...availability,
      exceptions: availability.exceptions.filter(e => e.date !== date)
    };

    onAvailabilityChange(newAvailability);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[500px] sm:max-w-none overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Gestione Blocchi
          </SheetTitle>
          <SheetDescription>
            Blocca date specifiche e aggiungi note personalizzate. I giorni bloccati non saranno disponibili per le prenotazioni.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Add/Edit Block Form */}
          {(isAdding || editingBlock) && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {editingBlock ? 'Modifica Blocco' : 'Nuovo Blocco'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="block-date">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(parseISO(formData.date), "PPP") : "Seleziona data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date ? parseISO(formData.date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="block-note">Nota (opzionale)</Label>
                  <Textarea
                    id="block-note"
                    placeholder="Aggiungi una nota per questo blocco..."
                    value={formData.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={editingBlock ? updateBlock : addBlock}
                    disabled={!formData.date}
                    className="flex-1"
                  >
                    {editingBlock ? 'Aggiorna' : 'Aggiungi'} Blocco
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetForm}
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add Button */}
          {!isAdding && !editingBlock && (
            <Button
              onClick={() => setIsAdding(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Nuovo Blocco
            </Button>
          )}

          <Separator />

          {/* Blocked Dates List */}
          <div>
            <h3 className="font-medium mb-3">
              Date Bloccate ({blockedDates.length})
            </h3>
            
            {blockedDates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nessun blocco impostato</p>
                <p className="text-sm">I blocchi impediranno le prenotazioni nelle date selezionate</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedDates.map((block) => {
                  const note = (block as any).note;
                  const isToday = format(new Date(), 'yyyy-MM-dd') === block.date;
                  const isPast = new Date(block.date) < new Date();
                  
                  return (
                    <div
                      key={block.date}
                      className={cn(
                        "p-3 border rounded-lg space-y-2",
                        isPast && "opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={isToday ? "default" : "secondary"}>
                            {format(parseISO(block.date), "dd MMM yyyy")}
                          </Badge>
                          {isToday && (
                            <Badge variant="outline" className="text-xs">
                              Oggi
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editBlock(block.date)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlock(block.date)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {note && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};