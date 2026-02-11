import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Calendar, MessageSquare, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HostQrScannerModal } from "./checkin/HostQrScannerModal";

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Check-in Scanner Button - Primary Position */}
            <Button 
              onClick={() => setIsScannerOpen(true)}
              className="bg-green-600 hover:bg-green-700 h-24 col-span-2 md:col-span-1 flex flex-col items-center justify-center gap-2 text-center whitespace-normal"
            >
              <QrCode className="w-6 h-6" />
              <span>📷 Scansiona QR (Check-in / Check-out)</span>
            </Button>
            
            <Button 
              onClick={() => navigate("/host/space/new")}
              className="bg-primary hover:bg-primary/90 h-24 flex flex-col items-center justify-center gap-2"
            >
              <PlusCircle className="w-6 h-6" />
              <span>Aggiungi Spazio</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate("/host/spaces")}
            >
              <Calendar className="w-6 h-6" />
              <span>Gestisci Spazi</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate("/messages")}
            >
              <MessageSquare className="w-6 h-6" />
              <span>Messaggi</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* QR Scanner Modal */}
      <HostQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </>
  );
}
