
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyBookingsStateProps {
  activeTab: "all" | "pending" | "confirmed" | "cancelled";
}

export const EmptyBookingsState = ({ activeTab }: EmptyBookingsStateProps) => {
  const navigate = useNavigate();

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "pending":
        return "Non hai prenotazioni in attesa.";
      case "confirmed":
        return "Non hai prenotazioni confermate.";
      case "cancelled":
        return "Non hai prenotazioni annullate.";
      default:
        return "Non hai ancora nessuna prenotazione.";
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Calendar className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nessuna prenotazione trovata
        </h3>
        <p className="text-gray-600 text-center mb-4">
          {getEmptyMessage()}
        </p>
        {activeTab === "all" && (
          <Button onClick={() => navigate("/dashboard")} className="bg-primary hover:bg-primary/90">
            Trova spazi
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
