
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Calendar, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Azioni Rapide</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            onClick={() => navigate("/spaces/new")}
            className="bg-[#4F46E5] hover:bg-[#4F46E5]/90 h-12"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Aggiungi Spazio
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12"
            onClick={() => {/* TODO: Implementa creazione evento */}}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Crea Evento
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12"
            onClick={() => {/* TODO: Implementa messaggi */}}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Messaggi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
