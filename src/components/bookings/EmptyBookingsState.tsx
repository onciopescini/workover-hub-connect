
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyBookingsStateProps {
  activeTab: "all" | "pending" | "confirmed" | "cancelled";
}

export const EmptyBookingsState = ({ activeTab }: EmptyBookingsStateProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Calendar className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nessuna prenotazione trovata
        </h3>
        <p className="text-gray-600 text-center mb-4">
          {activeTab === "all" 
            ? "Non hai ancora nessuna prenotazione."
            : `Non hai prenotazioni ${activeTab === "pending" ? "in attesa" : activeTab === "confirmed" ? "confermate" : "annullate"}.`
          }
        </p>
        {activeTab === "all" && (
          <Button onClick={() => navigate("/dashboard")} className="bg-[#4F46E5] hover:bg-[#4F46E5]/90">
            Trova spazi
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
