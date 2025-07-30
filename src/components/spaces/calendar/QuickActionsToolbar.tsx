import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Copy, 
  Zap, 
  CalendarX, 
  RotateCcw,
  Workflow
} from "lucide-react";
import { type AvailabilityData, type WeeklySchedule, type DaySchedule } from "@/types/availability";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface QuickActionsToolbarProps {
  availability: AvailabilityData;
  onAvailabilityChange: (availability: AvailabilityData) => void;
}

export const QuickActionsToolbar = ({
  availability,
  onAvailabilityChange
}: QuickActionsToolbarProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  // Default working hours template
  const DEFAULT_WORK_SCHEDULE: DaySchedule = {
    enabled: true,
    slots: [{ start: '09:00', end: '17:00' }]
  };

  // Apply weekly template (Monday to Friday working hours)
  const applyWeeklyTemplate = async () => {
    setIsApplying(true);
    
    try {
      const newRecurring: WeeklySchedule = {
        monday: { ...DEFAULT_WORK_SCHEDULE },
        tuesday: { ...DEFAULT_WORK_SCHEDULE },
        wednesday: { ...DEFAULT_WORK_SCHEDULE },
        thursday: { ...DEFAULT_WORK_SCHEDULE },
        friday: { ...DEFAULT_WORK_SCHEDULE },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] }
      };

      const newAvailability = {
        ...availability,
        recurring: newRecurring
      };

      onAvailabilityChange(newAvailability);
      
      toast({
        title: "Template applicato",
        description: "Orari lavorativi Lun-Ven (9:00-17:00) applicati con successo"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'applicazione del template",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Block weekends (Saturday and Sunday)
  const blockWeekends = async () => {
    setIsApplying(true);
    
    try {
      const newRecurring = {
        ...availability.recurring,
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] }
      };

      const newAvailability = {
        ...availability,
        recurring: newRecurring
      };

      onAvailabilityChange(newAvailability);
      
      toast({
        title: "Weekend bloccato",
        description: "Sabato e Domenica sono stati disabilitati"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nel bloccare i weekend",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Reset all availability
  const resetAvailability = async () => {
    setIsApplying(true);
    
    try {
      const resetSchedule: DaySchedule = { enabled: false, slots: [] };
      
      const newRecurring: WeeklySchedule = {
        monday: { ...resetSchedule },
        tuesday: { ...resetSchedule },
        wednesday: { ...resetSchedule },
        thursday: { ...resetSchedule },
        friday: { ...resetSchedule },
        saturday: { ...resetSchedule },
        sunday: { ...resetSchedule }
      };

      const newAvailability = {
        ...availability,
        recurring: newRecurring,
        exceptions: [] // Also clear exceptions
      };

      onAvailabilityChange(newAvailability);
      
      toast({
        title: "Calendario resettato",
        description: "Tutti gli orari e blocchi sono stati rimossi"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nel reset del calendario",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Duplicate current week template
  const duplicateWeekTemplate = async () => {
    setIsApplying(true);
    
    try {
      // Find first enabled day to use as template
      const enabledDay = Object.entries(availability.recurring).find(([_, schedule]) => schedule.enabled);
      
      if (!enabledDay) {
        toast({
          title: "Nessun template",
          description: "Imposta almeno un giorno prima di duplicare",
          variant: "destructive"
        });
        return;
      }

      const templateSchedule = enabledDay[1];
      const newRecurring: WeeklySchedule = {} as WeeklySchedule;
      
      // Apply template to all days
      Object.keys(availability.recurring).forEach(day => {
        newRecurring[day as keyof WeeklySchedule] = {
          enabled: templateSchedule.enabled,
          slots: [...templateSchedule.slots]
        };
      });

      const newAvailability = {
        ...availability,
        recurring: newRecurring
      };

      onAvailabilityChange(newAvailability);
      
      toast({
        title: "Template duplicato",
        description: `Orari di ${enabledDay[0]} applicati a tutti i giorni`
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nella duplicazione del template",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Count active days and blocked days
  const activeDays = Object.values(availability.recurring).filter(day => day.enabled).length;
  const blockedDays = availability.exceptions.filter(exception => !exception.enabled).length;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{activeDays}/7 giorni attivi</Badge>
              <Badge variant="secondary">{blockedDays} blocchi</Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={applyWeeklyTemplate}
              disabled={isApplying}
              className="flex items-center gap-2"
            >
              <Workflow className="w-4 h-4" />
              Template Lavorativo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={blockWeekends}
              disabled={isApplying}
              className="flex items-center gap-2"
            >
              <CalendarX className="w-4 h-4" />
              Blocca Weekend
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={duplicateWeekTemplate}
              disabled={isApplying || activeDays === 0}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Duplica Template
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={resetAvailability}
              disabled={isApplying}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Tutto
            </Button>
          </div>

          {/* Quick Actions Description */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Template Lavorativo:</strong> Applica orari 9:00-17:00 Lun-Ven</p>
            <p><strong>Blocca Weekend:</strong> Disabilita Sabato e Domenica</p>
            <p><strong>Duplica Template:</strong> Copia il primo giorno attivo a tutti i giorni</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};