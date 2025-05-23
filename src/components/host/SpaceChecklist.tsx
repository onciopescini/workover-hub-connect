
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";

interface ChecklistItem {
  id: string;
  section: string;
  completed: boolean;
}

interface SpaceChecklistProps {
  checklists: ChecklistItem[];
  spaceTitle?: string;
}

export function SpaceChecklist({ checklists, spaceTitle }: SpaceChecklistProps) {
  const completedItems = checklists.filter(item => item.completed).length;
  const totalItems = checklists.length;
  const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const sectionLabels: Record<string, string> = {
    photos: "Foto dello spazio",
    description: "Descrizione completa",
    rules: "Regole e linee guida",
    amenities: "Servizi disponibili",
    pricing: "Prezzi configurati",
    availability: "Disponibilità impostata"
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Completamento Spazio</CardTitle>
          <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
            {Math.round(completionPercentage)}% completato
          </Badge>
        </div>
        {spaceTitle && (
          <p className="text-sm text-gray-600">{spaceTitle}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={completionPercentage} className="h-2" />
          
          <div className="space-y-2">
            {checklists.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                {item.completed ? (
                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400" />
                )}
                <span className={`text-sm ${item.completed ? 'text-gray-600' : 'text-gray-900'}`}>
                  {sectionLabels[item.section] || item.section}
                </span>
              </div>
            ))}
          </div>
          
          {completionPercentage < 100 && (
            <Button variant="outline" size="sm" className="w-full mt-4">
              Completa Configurazione
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
