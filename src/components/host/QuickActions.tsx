import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Calendar, MessageSquare, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRScanner } from "./checkin/QRScanner";

export function QuickActions() {
  const navigate = useNavigate();
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Check-in Scanner Button - Primary Position */}
            <Button 
              onClick={() => setIsScannerOpen(true)}
              className="bg-green-600 hover:bg-green-700 h-12"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scansiona Check-in
            </Button>
            
            <Button 
              onClick={() => navigate("/host/space/new")}
              className="bg-[#4F46E5] hover:bg-[#4F46E5]/90 h-12"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Aggiungi Spazio
            </Button>
            
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => navigate("/host/spaces")}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Gestisci Spazi
            </Button>
            
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => navigate("/messages")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Messaggi
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* QR Scanner Modal */}
      <QRScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </>
  );
}
